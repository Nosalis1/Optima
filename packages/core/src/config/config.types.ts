export interface ConfigOptions {
    applicationVersion?: string;
    logging?: {
        consoleLog?: boolean;
    };
    collection?: {
        excludePaths?: string[];
        includeDefaultExcludes?: boolean;
        bucketIntervalMs?: number;
        maxEndpointsPerBucket?: number;
        eventLoopResolutionMs?: number;
    };
    thresholds?: {
        slowLatencyMs?: number;
        eventLoopLagMs?: number
    };
    cache?: {
        liveBuckets?: number;
        viewWindowBuckets?: number
    };
    persistence?: false | {
        baseDir?: string;
        persistRawRequests?: boolean;
        maxBufferSize?: number;
        archiveIntervalMs?: number;
        heartbeatIntervalMs?: number;
        shutdownDrainTimeoutMs?: number;
        writer?: {
            maxQueue?: number;
            maxRetries?: number;
            retryDelayMs?: number
        };
    };
    incidents?: {
        windowIntervals?: number;
        minRequests?: number;
        serverErrorRate?: number;
        recoveryRatio?: number;
        pendingForMs?: number;
        recoveryForMs?: number;
        resolvedHoldMs?: number;
        historySize?: number;
    };
    correlation?: {
        minCorrelation?: number;
        alpha?: number;
        power?: number;
        strongThreshold?: number;
        maxLag?: number;
        maxWindow?: number;
        minCoverage?: number;
        evaluateEveryIntervals?: number;
    };
    dashboard?: false | {
        path?: string;
        liveWindow?: number;
        backfillLimit?: number;
        maxBackfillAgeMs?: number;
        topImpactRoutes?: number;
        analyticsPageSize?: number;
        sessionSummaryWindowHours?: number;
    };
    transport?: {
        socketPath?: string;
        cors?: string | boolean;
        pingTimeoutMs?: number;
        maxHttpBufferSize?: number
    };
    publisher?: {
        intervalMs?: number
    };
    tickIntervalMs?: number;
    simulation?: false | {
        intervalMs?: number;
        requestsPerTick?: number
    };
}

type Resolved<T> =
    T extends false ? false
    : T extends readonly (infer U)[] ? readonly U[]
    : T extends object ? { readonly [K in keyof T]-?: Resolved<Exclude<T[K], undefined>> }
    : T;

export type ReadonlyConfig = Resolved<ConfigOptions>;

export type ClientConfig = {
    applicationVersion: string;
    collection: Pick<ReadonlyConfig['collection'], 'bucketIntervalMs' | 'excludePaths'>;
    thresholds: ReadonlyConfig['thresholds'];
    cache: Pick<ReadonlyConfig['cache'], 'viewWindowBuckets'>;
    persistence: false | Omit<Exclude<ReadonlyConfig['persistence'], false>, 'baseDir' | 'writer'>;
    incidents: ReadonlyConfig['incidents'];
    correlation: ReadonlyConfig['correlation'];
    dashboard: ReadonlyConfig['dashboard'];
    publisher: ReadonlyConfig['publisher'];
    tickIntervalMs: number;
    simulation: ReadonlyConfig['simulation'];
};
