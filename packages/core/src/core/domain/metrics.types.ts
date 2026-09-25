/**
 * Represents CPU metrics, including usage rate, number of cores, per-core usage, and breakdown of user, system, and idle usage.
 * @property {number} usageRate - The overall CPU usage rate (as a percentage).
 * @property {number} numberOfCores - The total number of CPU cores.
 * @property {number[]} perCoreUsage - An array representing the usage rate for each individual core (as percentages).
 * @property {number} userUsage - The CPU usage attributed to user processes (as a percentage).
 * @property {number} systemUsage - The CPU usage attributed to system processes (as a percentage).
 * @property {number} idleUsage - The CPU usage attributed to idle time (as a percentage).
 */
export interface CpuMetrics {
    usageRate: number;
    numberOfCores: number;
    perCoreUsage: number[];
    userUsage: number;
    systemUsage: number;
    idleUsage: number;
}

/**
 * Represents memory metrics, including heap usage, heap size, resident set size (RSS) memory, total RSS memory, and external memory usage.
 * @property {number} heapUsage - The amount of memory currently used by the V8 heap (in bytes).
 * @property {number} heapSize - The total size of the V8 heap (in bytes).
 * @property {number} rssMemory - The amount of resident set size (RSS) memory currently used by the process (in bytes).
 * @property {number} rssMemoryTotal - The total amount of RSS memory available to the process (in bytes).
 * @property {number} externalMemory - The amount of memory used by C++ objects bound to JavaScript objects managed by V8 (in bytes).
 */
export interface MemoryMetrics {
    heapUsage: number;
    heapSize: number;
    rssMemory: number;
    rssMemoryTotal: number;
    externalMemory: number;
}

/**
 * Represents event loop metrics, including the current lag and the threshold for acceptable lag.
 * @property {number} lag - The current event loop lag (in milliseconds).
 * @property {number} threshold - The threshold for acceptable event loop lag (in milliseconds).
 */
export interface EventLoopMetrics {
    lag: number;
    threshold: number;
}

/**
 * Represents garbage collection (GC) metrics, including counts, times, pause averages, summaries for different GC types, heap space allocations, and overall GC totals.
 * @property {number} gcCount - The total number of garbage collection runs.
 * @property {number} gcTime - The total time spent in garbage collection (in milliseconds).
 * @property {number} gcPauseAverage - The average pause time during garbage collection (in milliseconds).
 * @property {GCRunSummary} minorGC - Summary metrics for minor garbage collections.
 * @property {GCRunSummary} majorGC - Summary metrics for major garbage collections.
 * @property {GCRunSummary} incrementalGC - Summary metrics for incremental garbage collections.
 * @property {HeapSpaceAllocation[]} heapSpaces - An array of heap space allocations, each representing a specific heap space and its used memory.
 * @property {GCTotals} gcTotals - Overall totals for garbage collection, including total pause time, freed memory, promotions, and tenured size.
 */
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

/**
 * Represents libuv metrics, including counts of active handles, timers, sockets, and file descriptors.
 * @property {number} activeHandles - The total number of active libuv handles.
 * @property {number} activeHandlesTimers - The number of active libuv timer handles.
 * @property {number} activeHandlesSockets - The number of active libuv socket handles.
 * @property {number} activeLibuvHandles - The total number of active libuv handles (including timers and sockets).
 * @property {number} timers - The total number of libuv timers.
 * @property {number} fileDescriptors - The total number of file descriptors used by the process.
 */
export interface LibuvHandles {
    activeHandles: number;
    activeHandlesTimers: number;
    activeHandlesSockets: number;
    activeLibuvHandles: number;
    timers: number;
    fileDescriptors: number;
}

/**
 * Represents historic time series data for various metrics, including requests per second (RPS), latency, error rate, event loop lag, heap usage, heap size, resident set size (RSS) memory, total heap memory, and optional percentiles (p95 and p99).
 * @property {T} rps - Values of requests per second (RPS) values over time.
 * @property {T} latency - Values of latency values over time.
 * @property {T} errorRate - Values of error rate values over time.
 * @property {T} eventLoopLag - Values of event loop lag values over time.
 * @property {T} heapUsage - Values of heap usage values over time.
 * @property {T} heapSize - Values of heap size values over time.
 * @property {T} rssMemory - Values of resident set size (RSS) memory values over time.
 * @property {T} totalHeap - Values of total heap memory values over time (from health memory breakdown).
 * @property {T} p95 - Optional values of 95th percentile latency values over time.
 * @property {T} p99 - Optional values of 99th percentile latency values over time.
 */
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

/**
 * Represents historic time series data for various metrics, including requests per second (RPS), latency, error rate, event loop lag, heap usage, heap size, resident set size (RSS) memory, total heap memory, and optional percentiles (p95 and p99).
 * @property {number[]} rps - An array of requests per second (RPS) values over time.
 * @property {number[]} latency - An array of latency values over time.
 * @property {number[]} errorRate - An array of error rate values over time.
 * @property {number[]} eventLoopLag - An array of event loop lag values over time.
 * @property {number[]} heapUsage - An array of heap usage values over time.
 * @property {number[]} heapSize - An array of heap size values over time.
 * @property {number[]} rssMemory - An array of resident set size (RSS) memory values over time.
 * @property {number[]} totalHeap - An array of total heap memory values over time (from health memory breakdown).
 * @property {number[]} [p95] - Optional array of 95th percentile latency values over time.
 * @property {number[]} [p99] - Optional array of 99th percentile latency values over time.
 */
export interface HistoricTimeSeries extends HistoricSeries<number[]> { }

/**
 * Represents historic tick series data for various metrics, including requests per second (RPS), latency, error rate, event loop lag, heap usage, heap size, resident set size (RSS) memory, total heap memory, and optional percentiles (p95 and p99).
 * @property {number} rps - The requests per second (RPS) value at a specific tick.
 * @property {number} latency - The latency value at a specific tick.
 * @property {number} errorRate - The error rate value at a specific tick.
 * @property {number} eventLoopLag - The event loop lag value at a specific tick.
 * @property {number} heapUsage - The heap usage value at a specific tick.
 * @property {number} heapSize - The heap size value at a specific tick.
 * @property {number} rssMemory - The resident set size (RSS) memory value at a specific tick.
 * @property {number} totalHeap - The total heap memory value at a specific tick (from health memory breakdown).
 * @property {number} [p95] - Optional 95th percentile latency value at a specific tick.
 * @property {number} [p99] - Optional 99th percentile latency value at a specific tick.
 */
export interface HistoricTickSeries extends HistoricSeries<number> { }