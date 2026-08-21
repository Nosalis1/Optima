import type {
    EndpointTelemetry,
    DashboardData,
} from '../../domain';
import type {
    BucketStore
} from './bucket.store';
import type {
    HealthStore
} from './health.store';
import type {
    EndpointStore
} from './endpoint.store';
import type {
    AlertStore
} from './alert.store';

class DashboardStore {
    constructor(
        private readonly buckets: BucketStore,
        private readonly health: HealthStore,
        private readonly endpoints: EndpointStore,
        private readonly alerts: AlertStore
    ) { }

    get(): DashboardData {
        const history = this.buckets.getHistory();

        const latest = history[history.length - 1];

        const health = this.health.get();

        return {
            current: {
                rps: latest?.rps.count ?? 0,
                latency: latest?.latency.average ?? 0,
                errorRate: latest?.error.rate ?? 0,
                eventLoopLag: health.eventLoop.lag,
                heapUsage: health.memory.heapUsage,
                heapSize: health.memory.heapSize
            },

            history: {
                rps: history.map(bucket => bucket.rps.count),
                latency: history.map(bucket => bucket.latency.average),
                errorRate: history.map(bucket => bucket.error.rate),
                eventLoopLag: history.map(bucket => bucket.health.eventLoop.lag),
                heapUsage: history.map(bucket => bucket.health.memory.heapUsage),
                heapSize: history.map(bucket => bucket.health.memory.heapSize),
                rssMemory: history.map(bucket => bucket.health.memory.rssMemory),
                totalHeap: history.map(bucket => bucket.health.memory.heapSize),
                p95: history.map(bucket => bucket.latency.p95),
                p99: history.map(bucket => bucket.latency.p99)
            },

            charts: {
                throughput: {
                    rps: history.map(bucket => bucket.rps.count),
                    errorClient: history.map(bucket => bucket.error.clientCount),
                    errorServer: history.map(bucket => bucket.error.serverCount),
                    totalCount: history.reduce((acc, bucket) => acc + bucket.rps.count, 0)
                },
                percentiles: {
                    p50: history.map(bucket => bucket.latency.p50),
                    p95: history.map(bucket => bucket.latency.p95),
                    p99: history.map(bucket => bucket.latency.p99),
                    totalCount: history.reduce((acc, bucket) => acc + bucket.rps.count, 0)
                },
                runtimePerformance: {
                    heapUsage: history.map(bucket => bucket.health.memory.heapUsage),
                    heapSize: history.map(bucket => bucket.health.memory.heapSize),
                    lag: history.map(bucket => bucket.health.eventLoop.lag),
                    totalCount: history.reduce((acc, bucket) => acc + bucket.rps.count, 0)
                }
            },

            impactEndpoints: this.getImpactEndpoints(),

            alerts: this.alerts.get(5)
        }
    }

    private getImpactEndpoints(): EndpointTelemetry[] {
        return this.endpoints
            .all()
            .filter(endpoint => {
                return (
                    endpoint.errorRate > 0 ||
                    endpoint.p95! > 500
                );
            })
            .sort((a, b) => {
                const aScore = a.errorRate * 1000 + (a.p95 ?? 0);
                const bScore = b.errorRate * 1000 + (b.p95 ?? 0);

                return bScore - aScore;
            }).slice(0, 10);
    }
}

export { DashboardStore };