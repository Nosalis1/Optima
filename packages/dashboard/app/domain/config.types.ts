export interface ClientConfig {
    applicationVersion: string;
    collection: {
        bucketIntervalMs: number;
        excludePaths: string[];
    };
    thresholds: {
        slowLatencyMs: number;
        eventLoopLagMs: number;
    };
    cache: {
        viewWindowBuckets: number;
    };
    persistence: false | {
        persistRawRequests: boolean;
        maxBufferSize: number;
        archiveIntervalMs: number;
        heartbeatIntervalMs: number;
        shutdownDrainTimeoutMs: number;
    };
    incidents: {
        windowIntervals: number;
        minRequests: number;
        serverErrorRate: number;
        recoveryRatio: number;
        pendingForMs: number;
        recoveryForMs: number;
        resolvedHoldMs: number;
        historySize: number;
    };
    correlation: {
        minCorrelation: number;
        alpha: number;
        power: number;
        strongThreshold: number;
        maxLag: number;
        maxWindow: number;
        minCoverage: number;
        evaluateEveryIntervals: number;
    };
    dashboard: false | {
        path: string;
        liveWindow: number;
        backfillLimit: number;
        maxBackfillAgeMs: number;
        topImpactRoutes: number;
        analyticsPageSize: number;
        sessionSummaryWindowHours: number;
    };
    publisher: {
        intervalMs: number;
    };
    tickIntervalMs: number;
    simulation: false | {
        intervalMs: number;
        requestsPerTick: number;
    };
}
