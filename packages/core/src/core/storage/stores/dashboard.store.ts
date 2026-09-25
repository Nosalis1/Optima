import type { EndpointTelemetry, DashboardData, DashboardTickData } from '../../domain';
import type { BucketStore } from './bucket.store';
import type { HealthStore } from './health.store';
import type { EndpointStore } from './endpoint.store';
import type { AlertStore } from './alert.store';

const DASHBOARD_HISTORY_LENGTH = 60;
const MAX_IMPACT_ENDPOINTS = 10;
const MAX_ALERTS = 5;
const IMPACT_P95_THRESHOLD_MS = 500;

class DashboardStore {

    constructor(
        private readonly buckets: BucketStore,
        private readonly health: HealthStore,
        private readonly endpoints: EndpointStore,
        private readonly alerts: AlertStore
    ) { }

    get(): DashboardData {
        const history = this.buckets.getHistory();
        const latest = this.buckets.latest();
        const health = this.health.get();

        return {
            current: this.buildCurrent(latest, health),
            history: this.buildHistory(history),
            charts: this.buildCharts(history),
            impactEndpoints: this.getImpactEndpoints(),
            alerts: this.alerts.get(MAX_ALERTS)
        };
    }

    getTickData(): DashboardTickData {
        const history = this.buckets.getHistory();
        const latest = this.buckets.latest();
        const health = this.health.get();

        return {
            current: this.buildCurrent(latest, health),
            history: {
                rps: latest?.rps.count ?? 0,
                latency: latest?.latency.average ?? 0,
                errorRate: latest?.error.rate ?? 0,
                eventLoopLag: latest?.health.eventLoop.lag ?? 0,
                heapUsage: latest?.health.memory.heapUsage ?? 0,
                heapSize: latest?.health.memory.heapSize ?? 0,
                rssMemory: latest?.health.memory.rssMemory ?? 0,
                totalHeap: latest?.health.memory.heapSize ?? 0,
                p95: latest?.latency.p95,
                p99: latest?.latency.p99
            },
            charts: {
                throughput: {
                    rps: latest?.rps.count ?? 0,
                    errorClient: latest?.error.clientCount ?? 0,
                    errorServer: latest?.error.serverCount ?? 0,
                    totalCount: latest?.rps.count ?? 0,
                },

                percentiles: {
                    p50: latest?.latency.p50 ?? 0,
                    p95: latest?.latency.p95 ?? 0,
                    p99: latest?.latency.p99 ?? 0,
                    totalCount: latest?.rps.count ?? 0,
                },

                runtimePerformance: {
                    heapUsage: latest?.health.memory.heapUsage ?? 0,
                    heapSize: latest?.health.memory.heapSize ?? 0,
                    lag: latest?.health.eventLoop.lag ?? 0,
                    totalCount: latest?.rps.count ?? 0,
                },
            },

            impactEndpoints: this.getImpactEndpoints(),
            alerts: this.alerts.get(MAX_ALERTS)
        };
    }

    private fillRest(values: number[], length: number, fillValue: number): number[] {
        const filledValues = [...values];
        while (filledValues.length < length) {
            filledValues.unshift(fillValue);
        }
        return filledValues;
    }

    private buildCurrent(latest: ReturnType<BucketStore['latest']>, health: ReturnType<HealthStore['get']>): DashboardData['current'] {
        return {
            rps: latest?.rps.count ?? 0,
            latency: latest?.latency.average ?? 0,
            errorRate: latest?.error.rate ?? 0,
            eventLoopLag: health.eventLoop.lag,
            heapUsage: health.memory.heapUsage,
            heapSize: health.memory.heapSize
        };
    }

    private buildHistory(history: ReturnType<BucketStore['getHistory']>): DashboardData['history'] {
        return {
            rps: this.fillRest(history.map(bucket => bucket.rps.count), DASHBOARD_HISTORY_LENGTH, 0),
            latency: this.fillRest(history.map(bucket => bucket.latency.average), DASHBOARD_HISTORY_LENGTH, 0),
            errorRate: this.fillRest(history.map(bucket => bucket.error.rate), DASHBOARD_HISTORY_LENGTH, 0),
            eventLoopLag: this.fillRest(history.map(bucket => bucket.health.eventLoop.lag), DASHBOARD_HISTORY_LENGTH, 0),
            heapUsage: this.fillRest(history.map(bucket => bucket.health.memory.heapUsage), DASHBOARD_HISTORY_LENGTH, 0),
            heapSize: this.fillRest(history.map(bucket => bucket.health.memory.heapSize), DASHBOARD_HISTORY_LENGTH, 0),
            rssMemory: this.fillRest(history.map(bucket => bucket.health.memory.rssMemory), DASHBOARD_HISTORY_LENGTH, 0),
            totalHeap: this.fillRest(history.map(bucket => bucket.health.memory.heapSize), DASHBOARD_HISTORY_LENGTH, 0),
            p95: this.fillRest(history.map(bucket => bucket.latency.p95), DASHBOARD_HISTORY_LENGTH, 0),
            p99: this.fillRest(history.map(bucket => bucket.latency.p99), DASHBOARD_HISTORY_LENGTH, 0),
        };
    }

    private buildCharts(history: ReturnType<BucketStore['getHistory']>): DashboardData['charts'] {
        return {
            throughput: {
                rps: this.fillRest(history.map(bucket => bucket.rps.count), DASHBOARD_HISTORY_LENGTH, 0),
                errorClient: this.fillRest(history.map(bucket => bucket.error.clientCount), DASHBOARD_HISTORY_LENGTH, 0),
                errorServer: this.fillRest(history.map(bucket => bucket.error.serverCount), DASHBOARD_HISTORY_LENGTH, 0),
                totalCount: this.getTotalRequestCount(history)
            },
            percentiles: {
                p50: this.fillRest(history.map(bucket => bucket.latency.p50), DASHBOARD_HISTORY_LENGTH, 0),
                p95: this.fillRest(history.map(bucket => bucket.latency.p95), DASHBOARD_HISTORY_LENGTH, 0),
                p99: this.fillRest(history.map(bucket => bucket.latency.p99), DASHBOARD_HISTORY_LENGTH, 0),
                totalCount: this.getTotalRequestCount(history)
            },
            runtimePerformance: {
                heapUsage: this.fillRest(history.map(bucket => bucket.health.memory.heapUsage), DASHBOARD_HISTORY_LENGTH, 0),
                heapSize: this.fillRest(history.map(bucket => bucket.health.memory.heapSize), DASHBOARD_HISTORY_LENGTH, 0),
                lag: this.fillRest(history.map(bucket => bucket.health.eventLoop.lag), DASHBOARD_HISTORY_LENGTH, 0),
                totalCount: this.getTotalRequestCount(history)
            }
        };
    }

    private getTotalRequestCount(history: ReturnType<BucketStore['getHistory']>): number {
        return history.reduce((acc, bucket) => acc + bucket.rps.count, 0);
    }

    private getImpactEndpoints(): EndpointTelemetry[] {
        return this.endpoints.all()
            .filter(endpoint => { return (endpoint.errorRate > 0 || endpoint.p95! > IMPACT_P95_THRESHOLD_MS); })
            .sort((a, b) => { return (b.errorRate * 1000 + (b.p95 ?? 0)) - (a.errorRate * 1000 + (a.p95 ?? 0)); }).slice(0, 10)
            .slice(0, MAX_IMPACT_ENDPOINTS);
    }
}

export { DashboardStore };