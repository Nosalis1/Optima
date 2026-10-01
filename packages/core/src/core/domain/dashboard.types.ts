import type { AlertMessage, PaginationMeta } from './common.types';
import type { CpuMetrics, MemoryMetrics, EventLoopMetrics, GCMetrics, LibuvHandles, HistoricTimeSeries, HistoricTickSeries } from './metrics.types';
import type { V8RuntimeInfo } from './system.types';
import type { EndpointTelemetry, EndpointLatencyDistribution, EndpointVolume } from './endpoints.types';

/**
 * Represents the analytics filter settings used for filtering analytics data based on query, HTTP method, and status code.
 * @property {string} query - The search query string for filtering analytics data.
 * @property {'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method filter for analytics data.
 * @property {number} page - The page number for paginated analytics data.
 */
export interface AnalyticsFilterSettings {
    query: string;
    method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE';
    page: number;
}

/**
 * Represents the analytics data structure, including summary statistics, latency distribution, request volume, and a paginated table of endpoint telemetry data.
 * @property {object} summary - Summary statistics for the analytics data.
 * @property {number} summary.totalEndpoints - Total number of endpoints analyzed.
 * @property {number} summary.healthyEndpoints - Number of healthy endpoints.
 * @property {number} summary.slowEndpoints - Number of slow endpoints.
 * @property {number} summary.slowEndpointsThreshold - Threshold for determining slow endpoints.
 * @property {number} summary.errorEndpoints - Number of endpoints with errors.
 * @property {EndpointLatencyDistribution[]} latencyDistribution - Array of latency distribution data for each endpoint.
 * @property {EndpointVolume[]} requestVolume - Array of request volume data for each endpoint.
 * @property {object} endpointsTable - Paginated table of endpoint telemetry data.
 * @property {EndpointTelemetry[]} endpointsTable.data - Array of endpoint telemetry data for the current page.
 * @property {PaginationMeta} endpointsTable.pagination - Pagination metadata for the endpoints table.
 */
export interface AnalyticsData {
    summary: {
        totalEndpoints: number;
        healthyEndpoints: number;
        slowEndpoints: number;
        slowEndpointsThreshold: number;
        errorEndpoints: number;
    };
    latencyDistribution: EndpointLatencyDistribution[];
    requestVolume: EndpointVolume[];
    endpointsTable: {
        data: EndpointTelemetry[];
        pagination: PaginationMeta;
    };
    history: EndpointTelemetry[][];
    impactEndpoints: EndpointTelemetry[];
}

export interface HealthDetails {
    cpu: Pick<CpuMetrics, 'numberOfCores' | 'perCoreUsage'>;
    memory: Pick<MemoryMetrics, 'rssMemoryTotal' | 'externalMemory'>;
    eventLoop: Pick<EventLoopMetrics, 'threshold'>;
    handles: LibuvHandles;
    garbageCollection: GCMetrics;
    runtime: V8RuntimeInfo;
}

export const emptyHealthDetails = (): HealthDetails => ({
    cpu: { numberOfCores: 0, perCoreUsage: [] },
    memory: { rssMemoryTotal: 0, externalMemory: 0 },
    eventLoop: { threshold: 0 },
    handles: { activeHandles: 0, activeHandlesTimers: 0, activeHandlesSockets: 0, activeLibuvHandles: 0, timers: 0, fileDescriptors: 0 },
    garbageCollection: {
        gcCount: 0,
        gcTime: 0,
        gcPauseAverage: 0,
        minorGC: { runCount: 0, averageTime: 0 },
        majorGC: { runCount: 0, averageTime: 0 },
        incrementalGC: { runCount: 0, averageTime: 0 },
        heapSpaces: [],
        gcTotals: { totalPauseTime: 0, freedMemory: 0, promotions: 0, tenuredSize: 0 }
    },
    runtime: {
        pid: 0,
        platform: '',
        nodeVersion: '',
        v8Version: '',
        libuvVersion: '',
        openSSLVersion: '',
        threadPoolSize: 0,
        activeThreads: 0,
        startup: { bootstrapTime: 0, requiredModules: 0 }
    }
});