import type {
    DashboardData,
    DashboardTickData
} from '../domain';
import type { LocalRepository } from '../storage';
import {
    deriveMetrics,
    type MetricBucket
} from '../storage/stores/bucket-metric';
import { deriveEndpointView } from '../storage/stores/bucket-view';
import type { SeriesPoint } from './telemetry-query.service';

const DASHBOARD_HISTORY_LENGTH = 60;
const MAX_IMPACT_ENDPOINTS = 10;
const MAX_ALERTS = 5;
const IMPACT_P95_THRESHOLD_MS = 500;

type Derived = ReturnType<typeof deriveMetrics>;

interface Snapshot {
    points: SeriesPoint[];
    derived: Derived[];
    latest: SeriesPoint;
    latestDerived: Derived;
    sequence: number;
}

export class DashboardService {

    private lastTickSequence = 0;

    constructor(
        private readonly storage: LocalRepository
    ) { }

    private fillRest(arr: number[], length: number = DASHBOARD_HISTORY_LENGTH, fillValue: number = 0): number[] {
        const filledValues = [...arr];
        while (filledValues.length < length) {
            filledValues.unshift(fillValue);
        }
        return filledValues;
    }

    private getLatestBucket(): MetricBucket | null {
        return this.storage.bucket.latest() ?? null;
    }

    private buildCurrent(latest: MetricBucket, derived: ReturnType<typeof deriveMetrics>): DashboardData['current'] {
        return {
            rps: Math.round(derived.rps),
            latency: derived.averageLatency,
            errorRate: derived.errorRate,
            eventLoopLag: latest.runtime.loopDelay.meanMs,
            heapUsage: latest.runtime.memoryUsage.heapUsage,
            heapSize: latest.runtime.memoryUsage.heapSize
        };
    }

    private buildHistory(history: MetricBucket[], derived: ReturnType<typeof deriveMetrics>[]): DashboardData['history'] {
        return {
            rps: this.fillRest(derived.map(m => Math.round(m.rps))),
            latency: this.fillRest(derived.map(m => m.averageLatency)),
            errorRate: this.fillRest(derived.map(m => m.errorRate)),
            eventLoopLag: this.fillRest(history.map(b => b.runtime.loopDelay.meanMs)),
            heapUsage: this.fillRest(history.map(b => b.runtime.memoryUsage.heapUsage)),
            heapSize: this.fillRest(history.map(b => b.runtime.memoryUsage.heapSize)),
            rssMemory: this.fillRest(history.map(b => b.runtime.memoryUsage.rssMemory)),
            totalHeap: this.fillRest(history.map(b => b.runtime.memoryUsage.heapLimit)),
            p95: this.fillRest(derived.map(m => m.p95)),
            p99: this.fillRest(derived.map(m => m.p99))
        };
    }

    private buildHistoryLatest(latest: MetricBucket, derived: ReturnType<typeof deriveMetrics>): DashboardTickData['history'] {
        return {
            rps: derived.rps,
            latency: derived.averageLatency,
            errorRate: derived.errorRate,
            eventLoopLag: latest.runtime.loopDelay.meanMs,
            heapUsage: latest.runtime.memoryUsage.heapUsage,
            heapSize: latest.runtime.memoryUsage.heapSize,
            rssMemory: latest.runtime.memoryUsage.rssMemory,
            totalHeap: latest.runtime.memoryUsage.heapLimit,
            p95: derived.p95,
            p99: derived.p99
        };
    }

    private buildCharts(history: MetricBucket[], derived: ReturnType<typeof deriveMetrics>[]): DashboardData['charts'] {
        return {
            throughput: {
                rps: this.fillRest(derived.map(m => Math.round(m.rps))),
                errorClient: this.fillRest(derived.map(m => m.clientErrorCount)),
                errorServer: this.fillRest(derived.map(m => m.serverErrorCount)),
                totalCount: derived.length
            },
            percentiles: {
                p50: this.fillRest(derived.map(m => m.p50)),
                p95: this.fillRest(derived.map(m => m.p95)),
                p99: this.fillRest(derived.map(m => m.p99)),
                totalCount: derived.length
            },
            runtimePerformance: {
                heapUsage: this.fillRest(history.map(b => b.runtime.memoryUsage.heapUsage)),
                heapSize: this.fillRest(history.map(b => b.runtime.memoryUsage.heapSize)),
                lag: this.fillRest(history.map(b => b.runtime.loopDelay.meanMs)),
                totalCount: history.length
            }
        };
    }

    private buildChartsLatest(latest: MetricBucket, derived: ReturnType<typeof deriveMetrics>): DashboardTickData['charts'] {
        return {
            throughput: {
                rps: derived.rps,
                errorClient: derived.clientErrorCount,
                errorServer: derived.serverErrorCount,
                totalCount: 1
            },
            percentiles: {
                p50: derived.p50,
                p95: derived.p95,
                p99: derived.p99,
                totalCount: 1
            },
            runtimePerformance: {
                heapUsage: latest.runtime.memoryUsage.heapUsage,
                heapSize: latest.runtime.memoryUsage.heapSize,
                lag: latest.runtime.loopDelay.meanMs,
                totalCount: 1
            }
        }
    }

    private buildImpactEndpoints(derived: ReturnType<typeof deriveEndpointView>): DashboardData['impactEndpoints'] {
        if (derived.length === 0) return [];

        const filtered = derived.filter(e => e.errorRate > 0 || e.p95 > IMPACT_P95_THRESHOLD_MS);
        const sorted = filtered.sort((a, b) =>
            (b.errorRate * 1000 + b.p95) -
            (a.errorRate * 1000 + a.p95)
        );
        const sliced = sorted.slice(0, MAX_IMPACT_ENDPOINTS);

        return sliced.map(e => ({
            method: e.method,
            route: e.route,
            rps: e.rps,
            requestCount: e.requestCount,
            averageLatency: e.averageLatency,
            minLatency: e.minLatency,
            p50: e.p50,
            p95: e.p95,
            p99: e.p99,
            errorRate: e.errorRate,
            status: e.status
        }));
    }

    getDashboardData(): DashboardData | null {
        const latest = this.getLatestBucket();
        if (!latest) return null;
        const bucketHistory = this.storage.bucket.getHistory();

        const derivedMetricsLatest = deriveMetrics(latest.requests, latest.durationMs);
        const derivedMetricsHistory = bucketHistory.map(b => deriveMetrics(b.requests, b.durationMs));
        const derivedEndpointView = deriveEndpointView(bucketHistory);

        const current = this.buildCurrent(latest, derivedMetricsLatest);
        const history = this.buildHistory(bucketHistory, derivedMetricsHistory);
        const charts = this.buildCharts(bucketHistory, derivedMetricsHistory);
        const impactEndpoints = this.buildImpactEndpoints(derivedEndpointView);
        const alerts = this.storage.alerts.get(MAX_ALERTS);

        return {
            current,
            history,
            charts,
            impactEndpoints,
            alerts
        };
    }

    getDashboardLatest(): DashboardTickData | null {
        const latest = this.getLatestBucket();
        if (!latest) return null;
        const bucketHistory = this.storage.bucket.getHistory();

        const derivedMetricsLatest = deriveMetrics(latest.requests, latest.durationMs);
        const derivedEndpointView = deriveEndpointView(bucketHistory);

        const current = this.buildCurrent(latest, derivedMetricsLatest);
        const history = this.buildHistoryLatest(latest, derivedMetricsLatest);
        const charts = this.buildChartsLatest(latest, derivedMetricsLatest);
        const impactEndpoints = this.buildImpactEndpoints(derivedEndpointView);
        const alerts = this.storage.alerts.get(MAX_ALERTS);

        return {
            current,
            history,
            charts,
            impactEndpoints,
            alerts
        };
    }
}