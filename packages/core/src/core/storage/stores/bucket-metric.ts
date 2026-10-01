export type Origin = 'real' | 'synthetic';

export type RequestAggregate = {
    requestCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    durationSumMs: number;
    durationMaxMs: number | null;
    durationMinMs: number | null;
    histogramSchemaId: string;
    histogramCounts: number[];
};

export type RuntimeInterval = {
    cpuTimeUs: number | null;
    cpuUserUs: number | null;
    cpuSystemUs: number | null;
    heapUsedBytes: number | null;
    heapTotalBytes: number | null;
    heapLimitBytes: number | null;
    rssBytes: number | null;
    eventLoopSampleCount: number;
    eventLoopDelaySumMs: number | null;
    eventLoopDelayMaxMs: number | null;
    gcCount: number | null;
    gcDurationSumMs: number | null;
};

export type EndpointAggregate = RequestAggregate & { method: string; route: string; }
export type MetricBucket = {
    schemaVersion: typeof BUCKET_SCHEMA_VERSION;
    bucketId: string;
    sessionId: string;
    instanceId: string;
    sequence: number;
    startTime: string;
    endTime: string;
    durationMs: number;
    origin: Origin;
    requests: RequestAggregate;
    endpoints: EndpointAggregate[];
    runtime: RuntimeInterval;
    qualityFlags: string[];
}

export const BUCKET_SCHEMA_VERSION = 3 as const;

export const HISTOGRAM_SCHEMA_ID = 'lat-v1';
export const HISTOGRAM_UPPER_BOUNDS_MS: readonly number[] = [
    5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200,
    250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000,
    10_000, 30_000,
];
export const HISTOGRAM_BUCKET_COUNT = HISTOGRAM_UPPER_BOUNDS_MS.length + 1;

export function createAggregate(): RequestAggregate {
    return {
        requestCount: 0, clientErrorCount: 0, serverErrorCount: 0,
        durationSumMs: 0, durationMaxMs: null, durationMinMs: null,
        histogramSchemaId: HISTOGRAM_SCHEMA_ID,
        histogramCounts: new Array<number>(HISTOGRAM_BUCKET_COUNT).fill(0),
    };
}

export function histogramIndex(duration: number): number {
    let lo = 0, hi = HISTOGRAM_UPPER_BOUNDS_MS.length;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (duration <= HISTOGRAM_UPPER_BOUNDS_MS[mid]) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

export function recordInto(agg: RequestAggregate, durationMs: number, statusCode: number): boolean {
    if (!Number.isFinite(durationMs)) return false;
    const duration = Math.max(0, durationMs);
    agg.requestCount++;
    agg.durationSumMs += duration;
    agg.durationMaxMs = agg.durationMaxMs === null ? duration : Math.max(agg.durationMaxMs, duration);
    agg.durationMinMs = agg.durationMinMs === null ? duration : Math.min(agg.durationMinMs, duration);
    if (statusCode >= 400 && statusCode < 500) agg.clientErrorCount++;
    else if (statusCode >= 500) agg.serverErrorCount++;
    agg.histogramCounts[histogramIndex(duration)]++;
    return true;
}

const maxN = (a: number | null, b: number | null) => a === null ? b : b === null ? a : Math.max(a, b);
const minN = (a: number | null, b: number | null) => a === null ? b : b === null ? a : Math.min(a, b);

export function mergeInto(t: RequestAggregate, s: RequestAggregate): void {
    if (t.histogramSchemaId !== s.histogramSchemaId || t.histogramCounts.length !== s.histogramCounts.length) {
        throw new Error(`Cannot merge aggregates with different histogram schemas: ${t.histogramSchemaId} vs ${s.histogramSchemaId}`);
    }

    t.requestCount += s.requestCount;
    t.clientErrorCount += s.clientErrorCount;
    t.serverErrorCount += s.serverErrorCount;
    t.durationSumMs += s.durationSumMs;
    t.durationMaxMs = maxN(t.durationMaxMs, s.durationMaxMs);
    t.durationMinMs = minN(t.durationMinMs, s.durationMinMs);
    for (let i = 0; i < t.histogramCounts.length; i++) t.histogramCounts[i] += s.histogramCounts[i];
}

export function mergeAggregates(a: RequestAggregate, b: RequestAggregate): RequestAggregate {
    const out = { ...a, histogramCounts: [...a.histogramCounts] };
    mergeInto(out, b);
    return out;
}

export function percentileFromAggregate(agg: RequestAggregate, q: number): number {
    if (agg.requestCount === 0) return 0;
    const target = Math.max(1, Math.ceil(q * agg.requestCount));
    let cum = 0;
    for (let i = 0; i < agg.histogramCounts.length; i++) {
        cum += agg.histogramCounts[i];
        if (cum >= target) {
            const upper = i < HISTOGRAM_UPPER_BOUNDS_MS.length ? HISTOGRAM_UPPER_BOUNDS_MS[i] : Number.POSITIVE_INFINITY;
            return Math.min(upper, agg.durationMaxMs ?? upper);
        }
    }
    return agg.durationMaxMs ?? 0;
}

export function countSlowerThan(agg: RequestAggregate, thresholdMs: number): number {
    let count = 0;
    for (let i = 0; i < agg.histogramCounts.length; i++) {
        const lower = i === 0 ? 0 : HISTOGRAM_UPPER_BOUNDS_MS[i - 1];
        if (lower >= thresholdMs) count += agg.histogramCounts[i];
    }
    return count;
}

export function deriveMetrics(agg: RequestAggregate, durationMs: number) {
    const n = agg.requestCount;
    return {
        requestCount: n,
        rps: durationMs > 0 ? n / (durationMs / 1000) : 0,
        averageLatency: n > 0 ? agg.durationSumMs / n : 0,
        minLatency: agg.durationMinMs ?? 0,
        maxLatency: agg.durationMaxMs ?? 0,
        p50: percentileFromAggregate(agg, 0.50),
        p95: percentileFromAggregate(agg, 0.95),
        p99: percentileFromAggregate(agg, 0.99),
        errorRate: n > 0 ? (agg.clientErrorCount + agg.serverErrorCount) / n : 0,
        clientErrorCount: agg.clientErrorCount,
        serverErrorCount: agg.serverErrorCount,
    };
}

const sumN = (a: number | null, b: number | null) => a === null ? b : b === null ? a : a + b;

export function emptyRuntime(): RuntimeInterval {
    return {
        cpuTimeUs: null, cpuUserUs: null, cpuSystemUs: null,
        heapUsedBytes: null, heapTotalBytes: null, heapLimitBytes: null, rssBytes: null,
        eventLoopSampleCount: 0, eventLoopDelaySumMs: null, eventLoopDelayMaxMs: null,
        gcCount: null, gcDurationSumMs: null,
    };
}

export function mergeRuntimeInto(t: RuntimeInterval, s: RuntimeInterval, sIsLater: boolean): void {
    t.cpuTimeUs = sumN(t.cpuTimeUs, s.cpuTimeUs);
    t.cpuUserUs = sumN(t.cpuUserUs, s.cpuUserUs);
    t.cpuSystemUs = sumN(t.cpuSystemUs, s.cpuSystemUs);
    t.eventLoopSampleCount += s.eventLoopSampleCount;
    t.eventLoopDelaySumMs = sumN(t.eventLoopDelaySumMs, s.eventLoopDelaySumMs);
    t.eventLoopDelayMaxMs = maxN(t.eventLoopDelayMaxMs, s.eventLoopDelayMaxMs);
    t.gcCount = sumN(t.gcCount, s.gcCount);
    t.gcDurationSumMs = sumN(t.gcDurationSumMs, s.gcDurationSumMs);
    if (sIsLater) {
        t.heapUsedBytes = s.heapUsedBytes;
        t.heapTotalBytes = s.heapTotalBytes;
        t.heapLimitBytes = s.heapLimitBytes;
        t.rssBytes = s.rssBytes;
    }
}

export function deriveRuntime(rt: RuntimeInterval, durationMs: number) {
    const durationUs = durationMs * 1000;
    const pct = (us: number | null) => us !== null && durationUs > 0 ? (us / durationUs) * 100 : null;
    return {
        cpuPercent: pct(rt.cpuTimeUs),
        cpuUserPercent: pct(rt.cpuUserUs),
        cpuSystemPercent: pct(rt.cpuSystemUs),
        eventLoopDelayMeanMs: rt.eventLoopSampleCount > 0 && rt.eventLoopDelaySumMs !== null
            ? rt.eventLoopDelaySumMs / rt.eventLoopSampleCount : null,
        eventLoopDelayMaxMs: rt.eventLoopDelayMaxMs,
        gcCount: rt.gcCount,
        gcDurationSumMs: rt.gcDurationSumMs,
        gcPauseAverageMs: rt.gcCount && rt.gcDurationSumMs !== null ? rt.gcDurationSumMs / rt.gcCount : null,
        heapUsedBytes: rt.heapUsedBytes,
        heapTotalBytes: rt.heapTotalBytes,
        heapLimitBytes: rt.heapLimitBytes,
        rssBytes: rt.rssBytes,
    };
}

export function deepFreeze<T>(v: T): T {
    if (v !== null && typeof v === 'object' && !Object.isFrozen(v)) {
        Object.freeze(v);
        for (const x of Object.values(v as object)) deepFreeze(x);
    }
    return v;
}