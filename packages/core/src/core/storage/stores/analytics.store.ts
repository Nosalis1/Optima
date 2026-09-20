import type {
    EndpointLatencyDistribution,
    EndpointTelemetry,
    EndpointVolume,
    AnalyticsData,
    AnalyticsFilterSettings,
} from "../../domain";
import {
    EndpointStore
} from "./endpoint.store";
import {
    paginate
} from '../../utility';
import type { BucketStore } from "./bucket.store";

class AnalyticsStore {
    constructor(
        private readonly buckets: BucketStore,
        private readonly endpoints: EndpointStore,
        private readonly slowLatencyThreshold = 500,
    ) { }

    get(page = 1, pageSize = 20, filters: AnalyticsFilterSettings | undefined = undefined): AnalyticsData {
        const history = this.buckets.getHistory();

        const endpointList =
            this.endpoints.all()
                .filter(endpoint => {
                    if (filters) {
                        if (filters.method !== 'ALL' && endpoint.method !== filters.method) {
                            return false;
                        }
                        if (filters.status !== 'ALL') {
                            const statusCode = endpoint.status ? parseInt(endpoint.status) : undefined;
                            if (filters.status === '2xx' && (!statusCode || statusCode < 200 || statusCode >= 300)) {
                                return false;
                            }
                            if (filters.status === '4xx' && (!statusCode || statusCode < 400 || statusCode >= 500)) {
                                return false;
                            }
                            if (filters.status === '5xx' && (!statusCode || statusCode < 500 || statusCode >= 600)) {
                                return false;
                            }
                        }
                        if (filters.query && !endpoint.route.includes(filters.query)) {
                            return false;
                        }
                    }
                    return true;
                });

        const pagination = paginate<EndpointTelemetry>(endpointList, page, pageSize);

        return {
            summary: this.calculateSummary(endpointList),

            latencyDistribution: this.latencyDistribution(endpointList),

            requestVolume: this.requestVolume(endpointList),

            endpointsTable: {
                data: pagination.data,
                pagination: pagination.meta,
            },

            history: history.map(bucket => bucket.endpoints),
        };
    }

    private calculateSummary(endpoints: EndpointTelemetry[]): AnalyticsData['summary'] {
        return {
            totalEndpoints: endpoints.length,

            healthyEndpoints: endpoints.filter(e => e.errorRate === 0 && (e.p95 ?? 0) < this.slowLatencyThreshold).length,

            slowEndpoints: endpoints.filter(e => (e.p95 ?? 0) >= this.slowLatencyThreshold).length,
            slowEndpointsThreshold: this.slowLatencyThreshold,

            errorEndpoints: endpoints.filter(e => e.errorRate > 0).length,
        };
    }

    private latencyDistribution(endpoints: EndpointTelemetry[]): EndpointLatencyDistribution[] {
        return endpoints.map(
            endpoint => ({
                endpoint: this.endpointName(endpoint),
                p50: endpoint.averageLatency ?? 0,
                p95: endpoint.p95 ?? 0,
                p99: endpoint.p99 ?? 0,
            })
        );
    }

    private requestVolume(endpoints: EndpointTelemetry[]): EndpointVolume[] {
        return endpoints
            .map(endpoint => ({
                endpoint: this.endpointName(endpoint),
                volume: endpoint.requestCount ?? 0,
                rps: endpoint.rps,
            }))
            .sort((a, b) => b.volume - a.volume);
    }

    private endpointName(endpoint: EndpointTelemetry): string {
        return `${endpoint.method} ${endpoint.route}`;
    }
}

export { AnalyticsStore };