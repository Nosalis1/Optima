import { SessionRegistry } from "./session-registry";
import type { Incident, SessionRecord, SessionRouteImpact, SessionSummary } from "../../domain";
import type { TelemetryQueryService } from "../../telemetry/telemetry-query.service";
import { countSlowerThan, createAggregate, deriveMetrics, mergeInto, type RequestAggregate } from "../stores/bucket-metric";

const HOUR_MS = 60 * 60 * 1000;
const TARGET_POINTS = 60;
const TOP_ROUTES = 5;
const RESOLUTIONS_MS = [
    1_000, 5_000, 10_000, 30_000,
    60_000, 5 * 60_000, 10 * 60_000, 15 * 60_000, 30 * 60_000,
    HOUR_MS, 3 * HOUR_MS, 6 * HOUR_MS, 12 * HOUR_MS, 24 * HOUR_MS,
];

function pickResolution(spanMs: number): number {
    return RESOLUTIONS_MS.find(r => spanMs / r <= TARGET_POINTS) ?? RESOLUTIONS_MS[RESOLUTIONS_MS.length - 1];
}

const rate = (part: number, total: number) => total > 0 ? part / total : 0;

export async function buildSessionSummary(
    queries: TelemetryQueryService,
    session: SessionRecord,
    windowHours: number,
    slowLatencyMs: number,
    incidents: Incident[] = []
): Promise<SessionSummary> {
    const window = SessionRegistry.window(session);
    const startCandidate = new Date(window.end.getTime() - windowHours * HOUR_MS);
    if (startCandidate > window.start) window.start = startCandidate;

    const resolutionMs = pickResolution(window.end.getTime() - window.start.getTime());
    const result = await queries.query({
        sessionId: session.sessionId,
        from: window.start.toISOString(),
        to: window.end.toISOString(),
        resolutionMs,
        includeEndpoints: true,
        consistency: session.status === 'RUNNING' ? 'live' : 'committed',
    });

    const routes = new Map<string, { method: string; route: string; agg: RequestAggregate }>();
    const points = result.points.map(p => {
        for (const e of p.endpoints ?? []) {
            const key = `${e.method}:${e.route}`;
            let r = routes.get(key);
            if (!r) { r = { method: e.method, route: e.route, agg: createAggregate() }; routes.set(key, r); }
            mergeInto(r.agg, e);
        }

        const m = deriveMetrics(p.requests, p.durationMs);
        return {
            startTime: p.startTime,
            durationMs: p.durationMs,
            requestCount: m.requestCount,
            rps: m.rps,
            maxRps: p.maxRps,
            p95: m.p95,
            serverErrorRate: rate(m.serverErrorCount, m.requestCount),
            clientErrorCount: m.clientErrorCount,
            serverErrorCount: m.serverErrorCount,
        };
    });

    const topRoutes: SessionRouteImpact[] = [...routes.values()]
        .map(({ method, route, agg }) => ({
            method,
            route,
            requestCount: agg.requestCount,
            impactedRequests: agg.serverErrorCount + countSlowerThan(agg, slowLatencyMs),
            p95: deriveMetrics(agg, 1000).p95,
            serverErrorRate: rate(agg.serverErrorCount, agg.requestCount),
        }))
        .filter(r => r.impactedRequests > 0)
        .sort((a, b) => b.impactedRequests - a.impactedRequests || b.requestCount - a.requestCount)
        .slice(0, TOP_ROUTES);

    let missingIntervals = 0;
    let conflicts = 0;
    for (const issue of result.issues) {
        if (issue.type === 'GAP') missingIntervals += issue.toSequence - issue.fromSequence + 1;
        else if (issue.type === 'CONFLICT') conflicts++;
    }

    const t = result.total.derived;
    return {
        sessionId: session.sessionId,
        sessionNumber: session.sessionNumber,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        windowStart: window.start.toISOString(),
        windowEnd: window.end.toISOString(),
        measuredMs: result.total.durationMs,
        traffic: {
            requestCount: t.requestCount,
            avgRps: t.rps,
            peakRps: result.total.maxRps,
        },
        latency: {
            p50: t.p50,
            p95: t.p95,
            p99: t.p99,
            max: t.maxLatency,
        },
        errors: {
            serverErrorCount: t.serverErrorCount,
            serverErrorRate: rate(t.serverErrorCount, t.requestCount),
            clientErrorCount: t.clientErrorCount,
        },
        incidents,
        topRoutes,
        series: { resolutionMs, points },
        quality: {
            bucketCount: result.total.bucketCount,
            missingIntervals,
            conflicts,
            complete: result.complete,
        },
    };
}
