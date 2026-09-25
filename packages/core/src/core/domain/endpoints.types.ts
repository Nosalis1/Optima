import type {
    EndpointRoute
} from './common.types';

/**
 * Represents telemetry data for a specific endpoint, including request rate, latency percentiles, error rate, and optional status information.
 * @property {number} rps - Requests per second for the endpoint.
 * @property {number} p95 - 95th percentile latency for the endpoint.
 * @property {number} [p99] - Optional 99th percentile latency for the endpoint.
 * @property {number} errorRate - Error rate for the endpoint (as a percentage).
 * @property {string} [status] - Optional status of the endpoint (e.g., 'HEALTHY', 'UNHEALTHY').
 * @property {number} [requestCount] - Optional total number of requests made to the endpoint.
 * @property {number} [averageLatency] - Optional average latency for the endpoint.
 */
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

/**
 * Represents the latency distribution for a specific endpoint, including the 50th, 95th, and 99th percentile latencies.
 * @property {string} endpoint - The endpoint path (e.g., '/api/users').
 * @property {number} p50 - 50th percentile latency for the endpoint.
 * @property {number} p95 - 95th percentile latency for the endpoint.
 * @property {number} p99 - 99th percentile latency for the endpoint.
 */
export interface EndpointLatencyDistribution {
    endpoint: string;
    p50: number;
    p95: number;
    p99: number;
}

/**
 * Represents the request volume for a specific endpoint, including the total number of requests made to that endpoint.
 * @property {string} endpoint - The endpoint path (e.g., '/api/users').
 * @property {number} volume - The total number of requests made to the endpoint.
 */
export interface EndpointVolume {
    endpoint: string;
    volume: number;
    rps: number;
}