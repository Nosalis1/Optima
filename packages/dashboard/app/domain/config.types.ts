export interface ConfigOptions {
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
    tickIntervalMs: number;
    excludePaths: string[];

    consoleLog: boolean;

    ringBufferSize: number;
    alertBufferSize: number;
}