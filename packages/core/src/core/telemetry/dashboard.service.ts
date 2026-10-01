import { deriveMetrics, deriveRuntime } from '../storage/stores/bucket-metric';
import type { TelemetryQueryService, SeriesPoint, QueryIssue } from './telemetry-query.service';
import type { BucketsMessage, BucketsRequest, LiveBucketDto } from '../domain';

const LIVE_WINDOW = 5;
const DEFAULT_BACKFILL_LIMIT = 120;
const MAX_BACKFILL_LIMIT = 600;
const FALLBACK_BACKFILL_MS = 10 * 60_000;
const MAX_BACKFILL_AGE_MS = 60 * 60_000;

export function toLiveBucketDto(sessionId: string, p: SeriesPoint): LiveBucketDto {
    const m = deriveMetrics(p.requests, p.durationMs);
    const rt = deriveRuntime(p.runtime, p.durationMs);
    return {
        bucketId: `${sessionId}:${p.sequenceTo}`,
        sequence: p.sequenceTo,
        startTime: p.startTime,
        endTime: p.endTime,
        durationMs: p.durationMs,
        committed: p.committed === true,
        qualityFlags: p.qualityFlags,

        requestCount: m.requestCount,
        clientErrorCount: m.clientErrorCount,
        serverErrorCount: m.serverErrorCount,
        rps: m.rps,
        averageLatencyMs: m.averageLatency,
        p50Ms: m.p50,
        p95Ms: m.p95,
        p99Ms: m.p99,
        errorRate: m.errorRate,

        runtime: {
            eventLoopLagMs: rt.eventLoopDelayMeanMs ?? 0,
            heapUsageBytes: rt.heapUsedBytes ?? 0,
            heapSizeBytes: rt.heapTotalBytes ?? 0,
            rssMemoryBytes: rt.rssBytes ?? 0,
            heapLimitBytes: rt.heapLimitBytes ?? 0,
            cpuPercent: rt.cpuPercent ?? 0,
            cpuUserPercent: rt.cpuUserPercent ?? 0,
            cpuSystemPercent: rt.cpuSystemPercent ?? 0,
        }
    }
}

export class DashboardService {
    constructor(
        private readonly queries: TelemetryQueryService,
        private readonly currentSessionId: () => string
    ) { }

    /**
     * Get the latest live buckets message from RAM
     * @returns BucketsMessage | null
     */
    getLive(): BucketsMessage | null {
        const sessionId = this.currentSessionId();
        const result = this.queries.recent(LIVE_WINDOW, { consistency: 'live' });
        if (result.points.length === 0) return null;

        const buckets = result.points.map(p => toLiveBucketDto(sessionId, p));
        return {
            subscriptionId: null,
            sessionId,
            kind: 'live',
            buckets,
            lastSequence: buckets[buckets.length - 1].sequence,
            requestedAfterSequence: null,
            gaps: [],
            truncated: false,
            serverTime: new Date().toISOString(),
        };
    }

    async getBackFill(req: BucketsRequest): Promise<BucketsMessage> {
        const sessionId = this.currentSessionId();
        const limit = Math.min(Math.max(1, Math.floor(req.limit ?? DEFAULT_BACKFILL_LIMIT)), MAX_BACKFILL_LIMIT);
        const after = req.sessionId === sessionId && typeof req.afterSequence === 'number' && req.afterSequence >= 0
            ? Math.floor(req.afterSequence) : null;

        const message = (points: SeriesPoint[], gaps: Array<[number, number]>, truncated: boolean): BucketsMessage => {
            const buckets = points.map(p => toLiveBucketDto(sessionId, p));
            return {
                subscriptionId: req.subscriptionId,
                sessionId,
                kind: 'backfill',
                buckets,
                lastSequence: buckets.length ? buckets[buckets.length - 1].sequence : null,
                requestedAfterSequence: after,
                gaps,
                truncated,
                serverTime: new Date().toISOString(),
            };
        };

        const newest = this.queries.latestWindow(1, 'live');
        if (!newest) return message([], [], false);

        if (after === null) {
            const result = this.queries.recent(limit, { consistency: 'live' });
            return message(result.points, gapsOf(result.issues), false);
        }
        if (after >= newest.sequenceTo) return message([], [], false);

        const now = Date.now();
        const known = this.queries.liveBucket(after)?.endTime
            ?? this.queries.liveBucket(after + 1)?.startTime
            ?? req.afterEndTime;
        const requestedFrom = known ? Date.parse(known) : now - FALLBACK_BACKFILL_MS;
        const from = Math.max(Number.isNaN(requestedFrom) ? now - FALLBACK_BACKFILL_MS : requestedFrom, now - MAX_BACKFILL_AGE_MS);

        const result = await this.queries.query({
            sessionId,
            from: new Date(from).toISOString(),
            to: newest.to,
            consistency: 'live',
        });

        let points = result.points.filter(p => p.sequenceFrom > after && p.sequenceTo <= newest.sequenceTo);
        let truncated = false;
        if (points.length > limit) {
            truncated = true;
            points = points.slice(0, limit);
        }

        const sourceFailed = result.issues.some(i => i.type === 'SOURCE_ERROR');
        const upper = truncated ? points[points.length - 1].sequenceTo : newest.sequenceTo;
        const gaps = sourceFailed ? [] : missingRanges(after + 1, upper, points);
        return message(points, gaps, truncated);
    }
}

function gapsOf(issues: QueryIssue[]): Array<[number, number]> {
    return issues
        .filter((i): i is Extract<QueryIssue, { type: 'GAP' }> => i.type === 'GAP')
        .map(i => [i.fromSequence, i.toSequence] as [number, number]);
}

function missingRanges(from: number, to: number, points: readonly SeriesPoint[]): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    let next = from;
    for (const p of [...points].sort((a, b) => a.sequenceFrom - b.sequenceFrom)) {
        if (p.sequenceFrom > next) ranges.push([next, Math.min(p.sequenceFrom - 1, to)]);
        next = Math.max(next, p.sequenceTo + 1);
    }
    if (next <= to) ranges.push([next, to]);
    return ranges;
}
