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
    rps: number;
    errorCount: number;
    totalLatency: number;
    minLatency: number;
    histogram: Histogram;
    lastRequestAt: number;
}

interface EndpointTrackingRecord extends EndpointRecord {
    lastCalculationRequestCount: number;
    lastRecalculatedAt: number;
}

class EndpointStore {
    private readonly endpoints = new Map<string, EndpointTrackingRecord>();

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
                minLatency: input.duration,
                histogram: new Histogram(),
                lastRequestAt: Date.now(),
                rps: 0,
                lastCalculationRequestCount: 0,
                lastRecalculatedAt: 0,
            };

            this.endpoints.set(key, endpoint);
        }

        endpoint.requestCount++;
        endpoint.totalLatency += input.duration;
        endpoint.minLatency = Math.min(endpoint.minLatency, input.duration);
        endpoint.lastRequestAt = Date.now();
        endpoint.histogram.record(input.duration);

        if (input.statusCode >= 400) {
            endpoint.errorCount++;
        }

        this.handleTrackingRecord(endpoint, Date.now());
    }

    get(method: string, route: string): EndpointTelemetry | undefined {
        const endpoint = this.endpoints.get(this.createKey(method, route));
        if (!endpoint) {
            return undefined;
        }
        return this.map(endpoint, Date.now());
    }

    all(): EndpointTelemetry[] {
        const now = Date.now();
        return [...this.endpoints.values()].map(endpoint => this.map(endpoint, now));
    }

    private map(endpoint: EndpointTrackingRecord, now: number): EndpointTelemetry {
        const histogram = endpoint.histogram.snapshot();

        this.handleTrackingRecord(endpoint, now);

        return {
            method: endpoint.method,
            route: endpoint.route,
            rps: endpoint.rps,
            requestCount: endpoint.requestCount,
            averageLatency: endpoint.requestCount === 0 ? 0 : endpoint.totalLatency / endpoint.requestCount,
            minLatency: endpoint.minLatency,
            p95: histogram.p95,
            p99: histogram.p99,
            errorRate: endpoint.requestCount === 0 ? 0 : endpoint.errorCount / endpoint.requestCount,
            status: endpoint.errorCount > 0 ? "DEGRADED" : "HEALTHY",
        };
    }

    private handleTrackingRecord(endpoint: EndpointTrackingRecord, now: number): void {
        if (now - endpoint.lastRecalculatedAt >= 1000) {
            const requestsSinceLastCalculation = endpoint.requestCount - endpoint.lastCalculationRequestCount;
            endpoint.rps = requestsSinceLastCalculation;
            endpoint.lastCalculationRequestCount = endpoint.requestCount;
            endpoint.lastRecalculatedAt = now;
        }
    }

    reset(): void {
        this.endpoints.clear();
    }
}

export { EndpointStore };