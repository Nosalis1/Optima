import type { BucketsMessage, LiveBucketDto, DashboardData, HealthData, HealthDetails } from '../domain';

export const DASHBOARD_WINDOW = 60;
const NOMINAL_INTERVAL_S = 1;
const MAX_BUCKETS = 240;
const MAX_UNRECOVERABLE = 2000;

export interface LiveBucketsState {
    sessionId: string | null;
    buckets: ReadonlyMap<string, LiveBucketDto>;
    latestSequence: number | null;
    latestEndTime: string | null;
    unrecoverable: ReadonlySet<number>;
}

export const initialLiveState: LiveBucketsState = {
    sessionId: null,
    buckets: new Map(),
    latestSequence: null,
    latestEndTime: null,
    unrecoverable: new Set(),
};

export type LiveAction =
    | { type: 'MESSAGE'; message: BucketsMessage }
    | { type: 'RESET' };

function mergeBucket(prev: LiveBucketDto, next: LiveBucketDto): LiveBucketDto {
    return prev.committed && !next.committed ? { ...next, committed: true } : next;
}

export function liveBucketsReducer(state: LiveBucketsState, action: LiveAction): LiveBucketsState {
    if (action.type === 'RESET') return initialLiveState;

    const m = action.message;

    const base = state.sessionId === m.sessionId ? state : { ...initialLiveState, sessionId: m.sessionId };

    const next = new Map(base.buckets);
    for (const b of m.buckets) {
        const prev = next.get(b.bucketId);
        next.set(b.bucketId, prev ? mergeBucket(prev, b) : b);
    }

    if (next.size > MAX_BUCKETS) {
        const sorted = [...next.values()].sort((a, b) => a.sequence - b.sequence);
        for (const old of sorted.slice(0, next.size - MAX_BUCKETS)) next.delete(old.bucketId);
    }

    let latest: LiveBucketDto | null = null;
    for (const b of next.values()) if (!latest || b.sequence > latest.sequence) latest = b;

    const unrecoverable = new Set(base.unrecoverable);
    const have = new Set([...next.values()].map(b => b.sequence));
    for (const [from, to] of m.gaps) {
        for (let s = from; s <= to; s++)
            if (!have.has(s)) unrecoverable.add(s);
    }

    if (m.kind === 'backfill' && m.requestedAfterSequence !== null && m.lastSequence !== null) {
        for (let s = m.requestedAfterSequence + 1; s <= m.lastSequence; s++) {
            if (!have.has(s)) unrecoverable.add(s);
        }
    }
    if (unrecoverable.size > MAX_UNRECOVERABLE) {
        const keep = [...unrecoverable].sort((a, b) => a - b).slice(-MAX_UNRECOVERABLE);
        unrecoverable.clear();
        keep.forEach(s => unrecoverable.add(s));
    }

    return {
        sessionId: m.sessionId,
        buckets: next,
        latestSequence: latest?.sequence ?? base.latestSequence,
        latestEndTime: latest?.endTime ?? base.latestEndTime,
        unrecoverable
    };
}

export interface DashboardWindow {
    points: Array<LiveBucketDto | null>;
    times: number[];
    latest: LiveBucketDto | null;
    missing: number[];
    firstMissingGapFilled: boolean;
}

export function selectWindow(state: LiveBucketsState, length: number = DASHBOARD_WINDOW): DashboardWindow {
    const bySeq = new Map<number, LiveBucketDto>();
    for (const b of state.buckets.values()) bySeq.set(b.sequence, b);

    const last = state.latestSequence;
    if (last === null) {
        return {
            points: Array(length).fill(null),
            times: Array.from({ length }, (_, i) => i - length + 1),
            latest: null, missing: [], firstMissingGapFilled: true
        };
    }

    const points: Array<LiveBucketDto | null> = [];
    const missing: number[] = [];
    for (let s = last - length + 1; s <= last; s++) {
        const b = s >= 1 ? bySeq.get(s) ?? null : null;
        points.push(b);
        if (s >= 1 && !b && !state.unrecoverable.has(s)) missing.push(s);
    }
    const newest = bySeq.get(last);
    const anchor = newest ? Date.parse(newest.endTime) : null;
    const times = new Array<number>(points.length);
    for (let i = points.length - 1; i >= 0; i--) {
        const b = points[i];
        if (b && anchor !== null) times[i] = (Date.parse(b.endTime) - anchor) / 1000;
        else times[i] = i === points.length - 1 ? 0 : times[i + 1] - NOMINAL_INTERVAL_S;
    }

    return { points, times, latest: newest ?? null, missing, firstMissingGapFilled: missing.length === 0 };
}

type Series = DashboardData;

export function toDashboardSeries(window: DashboardWindow): Series {
    const pick = (f: (b: LiveBucketDto) => number) =>
        window.points.map(b => (b ? f(b) : null));
    const present = window.points.filter(Boolean).length;

    return {
        current: {
            rps: Math.round(window.latest?.rps ?? 0),
            latency: window.latest?.averageLatencyMs ?? 0,
            errorRate: window.latest?.errorRate ?? 0,
            eventLoopLag: window.latest?.runtime.eventLoopLagMs ?? 0,
            heapUsage: window.latest?.runtime.heapUsageBytes ?? 0,
            heapSize: window.latest?.runtime.heapSizeBytes ?? 0,
        },
        timeline: window.times,
        history: {
            rps: pick(b => Math.round(b.rps)),
            latency: pick(b => b.averageLatencyMs),
            errorRate: pick(b => b.errorRate),
            eventLoopLag: pick(b => b.runtime.eventLoopLagMs),
            heapUsage: pick(b => b.runtime.heapUsageBytes),
            heapSize: pick(b => b.runtime.heapSizeBytes),
            rssMemory: pick(b => b.runtime.rssMemoryBytes),
            totalHeap: pick(b => b.runtime.heapLimitBytes),
            p95: pick(b => b.p95Ms),
            p99: pick(b => b.p99Ms),
        },
        charts: {
            throughput: {
                rps: pick(b => Math.round(b.rps)),
                errorClient: pick(b => b.clientErrorCount),
                errorServer: pick(b => b.serverErrorCount),
                totalCount: present,
            },
            percentiles: {
                p50: pick(b => b.p50Ms),
                p95: pick(b => b.p95Ms),
                p99: pick(b => b.p99Ms),
                totalCount: present,
            },
            runtimePerformance: {
                heapUsage: pick(b => b.runtime.heapUsageBytes),
                heapSize: pick(b => b.runtime.heapSizeBytes),
                lag: pick(b => b.runtime.eventLoopLagMs),
                totalCount: present,
            },
        },
    };
}

export function emptyDashboardSeries(): Series {
    const empty: Array<number | null> = Array(DASHBOARD_WINDOW).fill(null);
    return {
        timeline: Array.from({ length: DASHBOARD_WINDOW }, (_, i) => i - DASHBOARD_WINDOW + 1),
        current: {
            rps: 0,
            latency: 0,
            errorRate: 0,
            eventLoopLag: 0,
            heapUsage: 0,
            heapSize: 0,
        },
        history: {
            rps: empty,
            latency: empty,
            errorRate: empty,
            eventLoopLag: empty,
            heapUsage: empty,
            heapSize: empty,
            rssMemory: empty,
            totalHeap: empty,
            p95: empty,
            p99: empty,
        },
        charts: {
            throughput: { rps: empty, errorClient: empty, errorServer: empty, totalCount: 0 },
            percentiles: { p50: empty, p95: empty, p99: empty, totalCount: 0 },
            runtimePerformance: { heapUsage: empty, heapSize: empty, lag: empty, totalCount: 0 },
        },
    };
}
export function toHealthData(window: DashboardWindow, details: HealthDetails): HealthData {
    const latest = window.latest;
    const clampPercent = (value: number) => Math.min(100, Math.max(0, value));
    const usageRate = clampPercent(latest?.runtime.cpuPercent ?? 0);
    const pick = (f: (b: LiveBucketDto) => number) =>
        window.points.map(b => (b ? f(b) : null));

    return {
        cpu: {
            ...details.cpu,
            usageRate,
            userUsage: clampPercent(latest?.runtime.cpuUserPercent ?? 0),
            systemUsage: clampPercent(latest?.runtime.cpuSystemPercent ?? 0),
            idleUsage: 100 - usageRate,
        },
        memory: {
            ...details.memory,
            heapUsage: latest?.runtime.heapUsageBytes ?? 0,
            heapSize: latest?.runtime.heapSizeBytes ?? 0,
            rssMemory: latest?.runtime.rssMemoryBytes ?? 0,
        },
        eventLoop: {
            ...details.eventLoop,
            lag: latest?.runtime.eventLoopLagMs ?? 0,
        },
        handles: details.handles,
        garbageCollection: details.garbageCollection,
        runtime: details.runtime,
        history: {
            timeline: window.times,
            eventLoopLag: pick(b => b.runtime.eventLoopLagMs),
            memoryBreakdown: {
                usedHeap: pick(b => b.runtime.heapUsageBytes),
                totalHeap: pick(b => b.runtime.heapSizeBytes),
                rssMemory: pick(b => b.runtime.rssMemoryBytes),
            },
        },
    };
}
