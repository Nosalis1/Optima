import type {
    EndpointTelemetry,
    HttpMethod,
} from "../../domain";
import {
    Histogram
} from '../utility';

interface EndpointRecord {
    method: HttpMethod | string;
    route: string;

    requestCount: number;
    errorCount: number;

    totalLatency: number;

    histogram: Histogram;

    lastRequestAt: number;
}

class EndpointStore {
    private readonly endpoints = new Map<string, EndpointRecord>();

    private createKey(method: HttpMethod | string, route: string): string {
        return `${method}:${route}`;
    }

    record(input: { method: string; route: string; duration: number; statusCode: number; }): void {
        const key = this.createKey(input.method, input.route);
        let endpoint = this.endpoints.get(key);

        if (!endpoint) {
            endpoint = {
                method: input.method,
                route: input.route,
                requestCount: 0,
                errorCount: 0,
                totalLatency: 0,
                histogram: new Histogram(),
                lastRequestAt: Date.now(),
            };

            this.endpoints.set(key, endpoint);
        }

        endpoint.requestCount++;
        endpoint.totalLatency += input.duration;
        endpoint.lastRequestAt = Date.now();
        endpoint.histogram.record(input.duration);

        if (input.statusCode >= 400) {
            endpoint.errorCount++;
        }
    }

    get(method: string, route: string): EndpointTelemetry | undefined {
        const endpoint = this.endpoints.get(this.createKey(method, route));
        if (!endpoint) {
            return undefined;
        }
        return this.map(endpoint);
    }

    all(): EndpointTelemetry[] {
        return [...this.endpoints.values()].map(endpoint => this.map(endpoint));
    }

    private map(endpoint: EndpointRecord): EndpointTelemetry {
        const histogram = endpoint.histogram.snapshot();

        return {
            method: endpoint.method,
            route: endpoint.route,
            rps: endpoint.requestCount - histogram.count, //????
            // calculated later from buckets
            requestCount: endpoint.requestCount,
            averageLatency: endpoint.requestCount === 0 ? 0 : endpoint.totalLatency / endpoint.requestCount,
            p95: histogram.p95,
            p99: histogram.p99,
            errorRate: endpoint.requestCount === 0 ? 0 : endpoint.errorCount / endpoint.requestCount,
            status: endpoint.errorCount > 0 ? "DEGRADED" : "HEALTHY",
        };
    }

    reset(): void {
        this.endpoints.clear();
    }
}

export { EndpointStore };