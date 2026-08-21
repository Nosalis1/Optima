import { AlertMessage, PaginationMeta } from './common.types';
import { CpuMetrics, MemoryMetrics, EventLoopMetrics, GCMetrics, LibuvHandles, HistoricTimeSeries } from './metrics.types';
import { V8RuntimeInfo } from './system.types';
import { EndpointTelemetry, EndpointLatencyDistribution, EndpointVolume } from './endpoints.types';

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

// Deep analytics engine slice
export interface AnalyticsData {
    // TODO: Maybe add these
    // slowestEndpoints (P95 > 1400ms)
    // busiestEndpoints (RPS > MaxRPS * 0.8)
    // mostErrorProneEndpoints (ErrorRate > MaxErrorRate * 0.8)
    // recentlyRecoveredEndpoints
    //?
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

// Hardware & Engine instance health slice
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