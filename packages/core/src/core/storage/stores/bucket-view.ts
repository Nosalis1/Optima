import {
    deriveMetrics,
    countSlowerThan,
    mergeInto,
    createAggregate,
    type MetricBucket,
    type RequestAggregate,
    type EndpointAggregate,
} from './bucket-metric';

export interface BucketView {
    timestamp: number;
    durationMs: number;
    quality: string[];
    rps: {
        value: number;
        count: number;
        perEndpoints: Map<string, number>;
    };
    latency: {
        average: number;
        p50: number;
        p95: number;
        p99: number;
        max: number;
        min: number;
    };
    error: {
        rate: number;
        clientCount: number;
        serverCount: number;
    };
}

export function toBucketView(b: MetricBucket): BucketView {
    const m = deriveMetrics(b.requests, b.durationMs);
    return {
        timestamp: Date.parse(b.startTime),
        durationMs: b.durationMs,
        quality: b.qualityFlags,
        rps: {
            value: m.rps,
            count: m.requestCount,
            perEndpoints: new Map(b.endpoints.map(e => [`${e.method}:${e.route}`, e.requestCount])),
        },
        latency: {
            average: m.averageLatency,
            p50: m.p50,
            p95: m.p95,
            p99: m.p99,
            max: b.requests.durationMaxMs ?? 0,
            min: b.requests.durationMinMs ?? 0
        },
        error: {
            rate: m.errorRate,
            clientCount: m.clientErrorCount,
            serverCount: m.serverErrorCount
        }
    };
}

export interface EndpointView {
    method: string;
    route: string;
    rps: number;
    requestCount: number;
    averageLatency: number;
    minLatency: number;
    p50: number;
    p95: number;
    p99: number;
    errorRate: number;
    impactedRequests: number;
    status: 'HEALTHY' | 'DEGRADED';
}

export interface EndpointSeriesInput {
    durationMs: number;
    endpoints?: readonly EndpointAggregate[];
}

export function deriveEndpointView(buckets: readonly EndpointSeriesInput[], slowLatencyMs: number): EndpointView[] {
    const merged = new Map<string, { method: string; route: string; agg: RequestAggregate }>();
    for (const b of buckets) {
        for (const e of b.endpoints ?? []) {
            const key = `${e.method}:${e.route}`;
            let m = merged.get(key);
            if (!m) { m = { method: e.method, route: e.route, agg: createAggregate() }; merged.set(key, m); }
            mergeInto(m.agg, e);
        }
    }
    const last = buckets[buckets.length - 1];
    return [...merged.entries()].map(([key, m]) => {
        const all = deriveMetrics(m.agg, 1000);
        const cur = last?.endpoints?.find(e => `${e.method}:${e.route}` === key);
        return {
            method: m.method, route: m.route,
            rps: cur && last ? deriveMetrics(cur, last.durationMs).rps : 0,
            requestCount: all.requestCount,
            averageLatency: all.averageLatency,
            minLatency: all.minLatency,
            p50: all.p50,
            p95: all.p95,
            p99: all.p99,
            errorRate: all.errorRate,
            impactedRequests: all.serverErrorCount + countSlowerThan(m.agg, slowLatencyMs),
            status: all.clientErrorCount + all.serverErrorCount > 0 ? 'DEGRADED' : 'HEALTHY',
        };
    });
}