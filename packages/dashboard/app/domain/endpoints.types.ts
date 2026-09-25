import { EndpointRoute } from './common.types';

export interface EndpointTelemetry extends EndpointRoute {
    rps: number;
    p95: number;
    p99?: number;
    errorRate: number;
    status?: string;
    requestCount?: number;
    averageLatency?: number;
    minLatency?: number;
}

export interface EndpointLatencyDistribution {
    endpoint: string;
    p50: number;
    p95: number;
    p99: number;
}

export interface EndpointVolume {
    endpoint: string;
    volume: number;
    rps: number;
}