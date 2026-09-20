import type {
    AlertMessage,
    PaginationMeta
} from './common.types';
import type {
    CpuMetrics,
    MemoryMetrics,
    EventLoopMetrics,
    GCMetrics,
    LibuvHandles,
    HistoricTimeSeries
} from './metrics.types';
import type {
    V8RuntimeInfo
} from './system.types';
import type {
    EndpointTelemetry,
    EndpointLatencyDistribution,
    EndpointVolume
} from './endpoints.types';

/**
 * Represents the complete dashboard data structure, including current metrics, historical data, impacted endpoints, alerts, and chart configurations.
 * @property {object} current - Current instantaneous values for various metrics.
 * @property {HistoricTimeSeries} history - Historical time series data for various metrics.
 * @property {EndpointTelemetry[]} impactEndpoints - List of impacted endpoints with their telemetry data.
 * @property {AlertMessage[]} alerts - List of alert messages.
 * @property {object} charts - Explicit chart configuration maps matching chart configurations directly.
 * @property {object} charts.throughputAndLatency - Chart data for throughput and latency metrics.
 * @property {object} charts.runtimePerformance - Chart data for runtime performance metrics.
 */
export interface DashboardData {
    // Current instantaneous values
    current: {
        rps: number;
        latency: number;
        errorRate: number;
        eventLoopLag: number;
        heapUsage: number;
        heapSize: number;
    };

    // Stream history arrays
    history: HistoricTimeSeries;
    impactEndpoints: EndpointTelemetry[];
    alerts: AlertMessage[];

    // Explicit chart configuration maps matching chart configurations directly
    charts: {
        throughput: {
            rps: number[];
            errorClient: number[];
            errorServer: number[];
            totalCount: number;
        },
        percentiles: {
            p50: number[];
            p95: number[];
            p99: number[];
            totalCount: number;
        };
        runtimePerformance: {
            heapUsage: number[];
            heapSize: number[];
            lag: number[];
            totalCount: number;
        };
    };
}

/**
 * Represents the analytics filter settings used for filtering analytics data based on query, HTTP method, and status code.
 * @property {string} query - The search query string for filtering analytics data.
 * @property {'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE'} method - The HTTP method filter for analytics data.
 * @property {'ALL' | '2xx' | '4xx' | '5xx'} status - The HTTP status code filter for analytics data.
 * @property {number} page - The page number for paginated analytics data.
 */
export interface AnalyticsFilterSettings {
    query: string;
    method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE';
    status: 'ALL' | '2xx' | '4xx' | '5xx';
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
}

/**
 * Represents the health data structure, including CPU metrics, memory metrics, event loop metrics, libuv handle metrics, garbage collection metrics, V8 runtime information, and historical data for event loop lag and memory breakdown.
 * @property {CpuMetrics} cpu - CPU metrics data.
 * @property {MemoryMetrics} memory - Memory metrics data.
 * @property {EventLoopMetrics} eventLoop - Event loop metrics data.
 * @property {LibuvHandles} handles - Libuv handle metrics data.
 * @property {GCMetrics} garbageCollection - Garbage collection metrics data.
 * @property {V8RuntimeInfo} runtime - V8 runtime information data.
 * @property {object} history - Historical data for event loop lag and memory breakdown.
 * @property {number[]} history.eventLoopLag - Array of historical event loop lag values.
 * @property {object} history.memoryBreakdown - Historical memory breakdown data.
 * @property {number[]} history.memoryBreakdown.usedHeap - Array of historical used heap memory values.
 * @property {number[]} history.memoryBreakdown.totalHeap - Array of historical total heap memory values.
 * @property {number[]} history.memoryBreakdown.rssMemory - Array of historical resident set size (RSS) memory values.
 */
export interface HealthData {
    cpu: CpuMetrics;
    memory: MemoryMetrics;
    eventLoop: EventLoopMetrics;
    handles: LibuvHandles;
    garbageCollection: GCMetrics;
    runtime: V8RuntimeInfo;
    history: {
        eventLoopLag: number[];
        memoryBreakdown: {
            usedHeap: number[];
            totalHeap: number[];
            rssMemory: number[];
        };
    };
}