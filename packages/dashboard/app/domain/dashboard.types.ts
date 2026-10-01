import { PaginationMeta } from './common.types';
import { CpuMetrics, MemoryMetrics, EventLoopMetrics, GCMetrics, LibuvHandles, HistoricGapSeries } from './metrics.types';
import { V8RuntimeInfo } from './system.types';
import { EndpointTelemetry, EndpointLatencyDistribution, EndpointVolume } from './endpoints.types';

interface DashboardChartData<T> {
    throughput: {
        rps: T;
        errorClient: T;
        errorServer: T;
        totalCount: number;
    };
    percentiles: {
        p50: T;
        p95: T;
        p99: T;
        totalCount: number;
    };
    runtimePerformance: {
        heapUsage: T;
        heapSize: T;
        lag: T;
        totalCount: number;
    };
}

// Primary App view container
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

    timeline: number[];
    // Stream history arrays
    history: HistoricGapSeries;
    // Explicit chart configuration maps matching chart configurations directly
    charts: DashboardChartData<Array<number | null>>;
}

// Deep analytics engine slice
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

// Hardware & Engine instance health slice
export interface HealthData {
    cpu: CpuMetrics;
    memory: MemoryMetrics;
    eventLoop: EventLoopMetrics;
    handles: LibuvHandles;
    garbageCollection: GCMetrics;
    runtime: V8RuntimeInfo;
    history: {
        timeline: number[];
        eventLoopLag: Array<number | null>;
        memoryBreakdown: {
            usedHeap: Array<number | null>;
            totalHeap: Array<number | null>;
            rssMemory: Array<number | null>;
        };
    };
}

export interface HealthDetails {
    cpu: Pick<CpuMetrics, 'numberOfCores' | 'perCoreUsage'>;
    memory: Pick<MemoryMetrics, 'rssMemoryTotal' | 'externalMemory'>;
    eventLoop: Pick<EventLoopMetrics, 'threshold'>;
    handles: LibuvHandles;
    garbageCollection: GCMetrics;
    runtime: V8RuntimeInfo;
}