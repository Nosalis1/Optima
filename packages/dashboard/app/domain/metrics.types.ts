export interface CpuMetrics {
    usageRate: number;
    numberOfCores: number;
    perCoreUsage: number[];
    userUsage: number;
    systemUsage: number;
    idleUsage: number;
}

export interface MemoryMetrics {
    heapUsage: number;
    heapSize: number;
    rssMemory: number;
    rssMemoryTotal: number;
    externalMemory: number;
}

export interface EventLoopMetrics {
    lag: number;
    threshold: number;
}

export interface GCMetrics {
    gcCount: number;
    gcTime: number;
    gcPauseAverage: number;
    minorGC: GCRunSummary;
    majorGC: GCRunSummary;
    incrementalGC: GCRunSummary;
    heapSpaces: HeapSpaceAllocation[];
    gcTotals: GCTotals;
}

interface GCRunSummary {
    runCount: number;
    averageTime: number;
}

interface HeapSpaceAllocation {
    label: string;
    used: number;
}

interface GCTotals {
    totalPauseTime: number;
    freedMemory: number;
    promotions: number;
    tenuredSize: number;
}

export interface LibuvHandles {
    activeHandles: number;
    activeHandlesTimers: number;
    activeHandlesSockets: number;
    activeLibuvHandles: number;
    timers: number;
    fileDescriptors: number;
}

interface HistoricSeries<T> {
    rps: T;
    latency: T;
    errorRate: T;
    eventLoopLag: T;
    heapUsage: T;
    heapSize: T;
    rssMemory: T;
    totalHeap: T;
    p95?: T;
    p99?: T;
}

// Aggregated Historic Profiles
export interface HistoricTimeSeries extends HistoricSeries<number[]> { }
export interface HistoricTickSeries extends HistoricSeries<number> { }