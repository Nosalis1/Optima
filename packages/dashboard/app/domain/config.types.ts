export interface ConfigOptions {
    applicationVersion?: string;

    dashboardPath: string | false;

    simulation: false | {
        intervalMs: number;
        requestsPerTick: number;
    };
    publisher: {
        intervalMs: number;
        slowLatencyThresholdMs: number;
        eventLoopLagThresholdMs: number;
        eventLoopResolutionMs?: number;
    };
    persistence: false | {
        baseDir: string;
        maxBufferSize?: number;
        persistRawRequests?: boolean;
        archiveIntervalMs?: number;
    };
    tickIntervalMs: number;
    excludePaths: string[];

    consoleLog: boolean;

    ringBufferSize: number;
    alertBufferSize: number;
}