import { DEFAULT_CONFIG, type ReadonlyConfig } from "../../config";
import type { AnalyticsData, AnalyticsFilterSettings, EndpointLatencyDistribution, EndpointTelemetry, EndpointVolume } from "../domain";
import type { TelemetryQueryService } from "./telemetry-query.service";
import { deriveEndpointView, type EndpointView } from "../storage/stores/bucket-view";
import { paginate } from "../utility";

export class AnalyticsService {
    readonly slowLatencyThreshold: number;
    private readonly viewWindowBuckets: number;
    private readonly topImpactRoutes: number;

    constructor(
        private readonly queries: TelemetryQueryService,
        config: ReadonlyConfig
    ) {
        const dashboard = config.dashboard === false ? DEFAULT_CONFIG.dashboard : config.dashboard;
        this.slowLatencyThreshold = config.thresholds.slowLatencyMs;
        this.viewWindowBuckets = config.cache.viewWindowBuckets;
        this.topImpactRoutes = dashboard.topImpactRoutes;
    }

    private matchesFilters(endpoint: EndpointView, filters: AnalyticsFilterSettings | undefined): boolean {
        if (!filters) return true;
        if (filters.method !== 'ALL' && endpoint.method !== filters.method) return false;
        if (filters.query && !endpoint.route.includes(filters.query)) return false;
        return true;
    }

    private toTelemetry(derived: EndpointView): EndpointTelemetry {
        return {
            method: derived.method,
            route: derived.route,
            rps: derived.rps,
            requestCount: derived.requestCount,
            averageLatency: derived.averageLatency,
            minLatency: derived.minLatency,
            p50: derived.p50,
            p95: derived.p95,
            p99: derived.p99,
            errorRate: derived.errorRate,
            impactedRequests: derived.impactedRequests,
            status: derived.status,
        };
    }

    get(page = 1, pageSize = 20, filters: AnalyticsFilterSettings | undefined = undefined): AnalyticsData {
        const recent = this.queries.recent(this.viewWindowBuckets, { consistency: 'live', includeEndpoints: true });
        const endpointViews = deriveEndpointView(recent.points, this.slowLatencyThreshold);

        const endpointList = endpointViews.filter(e => this.matchesFilters(e, filters))
            .sort((a, b) => a.method.localeCompare(b.method));
        const telemetryList = endpointList.map(e => this.toTelemetry(e));

        const pagination = paginate<EndpointTelemetry>(telemetryList, page, pageSize);

        return {
            summary: this.calculateSummary(endpointList),
            latencyDistribution: this.latencyDistribution(endpointList),
            requestVolume: this.requestVolume(endpointList),
            endpointsTable: {
                data: pagination.data,
                pagination: pagination.meta,
            },
            impactEndpoints: this.impactEndpoints(endpointViews),
            history: [] // TODO: Remove in future, as history is not currently being used in the analytics dashboard
        };
    }

    private impactEndpoints(endpoints: EndpointView[]): EndpointTelemetry[] {
        return endpoints
            .filter(e => e.impactedRequests > 0)
            .sort((a, b) => b.impactedRequests - a.impactedRequests || b.requestCount - a.requestCount)
            .slice(0, this.topImpactRoutes)
            .map(e => this.toTelemetry(e));
    }

    private calculateSummary(endpoints: EndpointView[]): AnalyticsData['summary'] {
        return {
            totalEndpoints: endpoints.length,
            healthyEndpoints: endpoints.filter(e => e.errorRate === 0 && e.p95 < this.slowLatencyThreshold).length,
            slowEndpoints: endpoints.filter(e => e.p95 >= this.slowLatencyThreshold).length,
            slowEndpointsThreshold: this.slowLatencyThreshold,
            errorEndpoints: endpoints.filter(e => e.errorRate > 0).length,
        };
    }

    private latencyDistribution(endpoints: EndpointView[]): EndpointLatencyDistribution[] {
        return endpoints.map(endpoint => ({
            endpoint: this.endpointName(endpoint),
            p50: endpoint.p50,
            p95: endpoint.p95,
            p99: endpoint.p99,
        }));
    }

    private requestVolume(endpoints: EndpointView[]): EndpointVolume[] {
        return endpoints
            .map(endpoint => ({
                endpoint: this.endpointName(endpoint),
                volume: endpoint.requestCount,
                rps: endpoint.rps,
            }))
            .sort((a, b) => b.volume - a.volume);
    }

    private endpointName(endpoint: EndpointView): string {
        return `${endpoint.method} ${endpoint.route}`;
    }
}