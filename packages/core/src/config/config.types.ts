export interface ConfigOptions {
    applicationVersion?: string; // Version of the application, used for metrics and logging

    dashboardPath?: string | false; // Path to the metrics dashboard, or false to disable it

    simulation?: false | { // Simulation configuration, or false to disable it
        intervalMs: number; // Interval in milliseconds between simulation ticks
        requestsPerTick: number; // Number of requests to simulate per tick
    };
    publisher?: { // Configuration for the metrics publisher
        intervalMs: number; // Interval in milliseconds between publishing metrics
        slowLatencyThresholdMs: number; // Threshold in milliseconds for considering a request as slow
        eventLoopLagThresholdMs: number; // Threshold in milliseconds for considering the event loop as lagging
        eventLoopResolutionMs?: number; // Optional resolution in milliseconds for measuring event loop lag
    };
    persistence?: false | { // Configuration for metrics persistence
        baseDir: string; // Base directory for storing metrics data
        maxBufferSize?: number; // Maximum size of the buffer for storing metrics data before flushing to disk
        persistRawRequests?: boolean; // Whether to persist raw request data to disk
        archiveIntervalMs?: number; // Interval in milliseconds for archiving old metrics data
    };
    tickIntervalMs?: number; // Interval in milliseconds for the internal tick of the metrics system
    excludePaths?: string[]; // Array of paths to exclude from metrics collection

    consoleLog?: boolean; // Whether to log metrics to the console

    ringBufferSize?: number; // Size of the ring buffer for storing metrics data
    alertBufferSize?: number; // Size of the buffer for storing alert data
}

export type ReadonlyConfig = Readonly<Required<ConfigOptions>>; 