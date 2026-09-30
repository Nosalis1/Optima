import { SessionRegistry } from "./session-registry";
import type { SessionRecord, SessionSummary, HourlyBucket } from "../../domain";
import type { TelemetryQueryService, QueryIssue } from "../../telemetry/telemetry-query.service";
import { deriveMetrics } from "../stores/bucket-metric";

const HOUR_MS = 60 * 60 * 1000;

const hourKeyFor = (date: Date | string): string => {
    if (typeof date === 'string') date = new Date(date);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())).toISOString();
}

export async function buildSessionSummary(queries: TelemetryQueryService, session: SessionRecord, windowHours: number, slowLatencyMs: number,):
    Promise<SessionSummary & { issues: QueryIssue[]; complete: boolean; latency: { p50: number; p95: number; p99: number } }> {
    const window = SessionRegistry.window(session);
    const startCandidate = new Date(window.end.getTime() - windowHours * HOUR_MS);
    if (startCandidate > window.start) window.start = startCandidate;

    const result = await queries.query({
        sessionId: session.sessionId,
        from: window.start.toISOString(),
        to: window.end.toISOString(),
        resolutionMs: HOUR_MS,
        includeEndpoints: true,
        consistency: session.status === 'RUNNING' ? 'live' : 'committed',
    });

    const perHour: HourlyBucket[] = result.points.map((p: any) => {
        const m = deriveMetrics(p.requests, p.durationMs);

        let healthy = 0, slow = 0;
        for (const e of p.endpoints ?? []) {
            const em = deriveMetrics(e, 1000);
            if (em.averageLatency > slowLatencyMs) slow++;
            else if (em.clientErrorCount + em.serverErrorCount === 0) healthy++;
        }

        return {
            hourStart: hourKeyFor(new Date(p.startTime)),
            clientErrorCount: m.clientErrorCount,
            serverErrorCount: m.serverErrorCount,
            avgRps: m.rps,
            maxRps: p.maxRps,
            avgLatency: m.averageLatency,
            maxLatency: m.maxLatency,
            healthyEndpointCount: healthy,
            slowEndpointCount: slow,
            sampleCount: p.bucketCount,
        };
    });

    const t = result.total.derived;
    return {
        sessionNumber: session.sessionNumber,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        windowStart: window.start.toISOString(),
        windowEnd: window.end.toISOString(),
        clientErrorCount: t.clientErrorCount,
        serverErrorCount: t.serverErrorCount,
        avgRps: t.rps,
        maxRps: result.total.maxRps,
        avgLatency: t.averageLatency,
        maxLatency: t.maxLatency,
        sampleCount: result.total.bucketCount,
        perHour,
        latency: { p50: t.p50, p95: t.p95, p99: t.p99 },
        issues: result.issues,
        complete: result.complete,
    };
}