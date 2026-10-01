import type {
    ClientConfig,
    ConfigOptions,
    ReadonlyConfig
} from './config.types';
import Logger from '../core/telemetry/logger';

type Section<K extends keyof ReadonlyConfig> = Exclude<ReadonlyConfig[K], false>;

const DEFAULT_EXCLUDE_PATHS = [
    '/_next/**',
    '**/*.map',
    '**/*.js',
    '**/*.css',
    '/favicon.ico',
];

export const DEFAULT_CONFIG = {
    applicationVersion: '1.0.0',
    logging: { consoleLog: true },
    collection: {
        excludePaths: [] as readonly string[],
        includeDefaultExcludes: true,
        bucketIntervalMs: 1000,
        maxEndpointsPerBucket: 200,
        eventLoopResolutionMs: 20,
    },
    thresholds: {
        slowLatencyMs: 500,
        eventLoopLagMs: 100
    },
    cache: {
        liveBuckets: 300,
        viewWindowBuckets: 60
    },
    persistence: {
        baseDir: './metrics_data',
        persistRawRequests: true,
        maxBufferSize: 1000,
        archiveIntervalMs: 24 * 60 * 60 * 1000,
        heartbeatIntervalMs: 30000,
        shutdownDrainTimeoutMs: 5000,
        writer: {
            maxQueue: 1000,
            maxRetries: 3,
            retryDelayMs: 100
        }
    },
    incidents: {
        windowIntervals: 60,
        minRequests: 100,
        serverErrorRate: 0.05,
        recoveryRatio: 0.5,
        pendingForMs: 30000,
        recoveryForMs: 60000,
        resolvedHoldMs: 30000,
        historySize: 100
    },
    correlation: {
        minCorrelation: 0.5,
        alpha: 0.05,
        power: 0.8,
        strongThreshold: 0.7,
        maxLag: 10,
        maxWindow: 60,
        minCoverage: 0.5,
        evaluateEveryIntervals: 10
    },
    dashboard: {
        path: '/optima-metrics',
        liveWindow: 60,
        backfillLimit: 1000,
        maxBackfillAgeMs: 24 * 60 * 60 * 1000,
        topImpactRoutes: 10,
        analyticsPageSize: 50,
        sessionSummaryWindowHours: 24
    },
    transport: {
        socketPath: '/socket.io/',
        cors: '*' as string | boolean,
        pingTimeoutMs: 5000,
        maxHttpBufferSize: 1 * 1024 * 1024
    },
    publisher: {
        intervalMs: 1000
    },
    tickIntervalMs: 250,
    simulation: {
        intervalMs: 100,
        requestsPerTick: 20
    },
} as const satisfies { [K in keyof ReadonlyConfig]: Section<K> };

function num(value: unknown, fallback: number, min: number, max: number = Number.POSITIVE_INFINITY): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return fallback;
    }
    return Math.min(Math.max(value, min), max);
}

function bool(value: unknown, fallback: boolean): boolean {
    if (typeof value !== 'boolean') {
        return fallback;
    }
    return value;
}

function str(value: unknown, fallback: string): string {
    if (typeof value !== 'string' || value.length === 0) {
        return fallback;
    }
    return value;
}

function enabled<T extends object>(value: false | true | T | undefined, enabledByDefault: boolean): T | false {
    if (value === undefined) return enabledByDefault ? {} as T : false;
    if (value === false) return false;
    if (value === true) return {} as T;
    if (typeof value === 'object' && value !== null) return value;
    return enabledByDefault ? {} as T : false;
}

function normalizePath(path: string): string {
    const withSlash = path.startsWith('/') ? path : `/${path}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

function deepFreeze<T>(value: T): T {
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const v of Object.values(value as object)) deepFreeze(v);
    }
    return value;
}

function resolve(o: ConfigOptions = {}): ReadonlyConfig {
    const d = DEFAULT_CONFIG;

    const dashboardOptions = enabled(o.dashboard as ConfigOptions['dashboard'] | true, true);
    const dashboard: ReadonlyConfig['dashboard'] = dashboardOptions === false ? false : {
        path: normalizePath(str(dashboardOptions.path, d.dashboard.path)),
        liveWindow: num(dashboardOptions.liveWindow, d.dashboard.liveWindow, 1),
        backfillLimit: num(dashboardOptions.backfillLimit, d.dashboard.backfillLimit, 1),
        maxBackfillAgeMs: num(dashboardOptions.maxBackfillAgeMs, d.dashboard.maxBackfillAgeMs, 1),
        topImpactRoutes: num(dashboardOptions.topImpactRoutes, d.dashboard.topImpactRoutes, 1),
        analyticsPageSize: num(dashboardOptions.analyticsPageSize, d.dashboard.analyticsPageSize, 1),
        sessionSummaryWindowHours: num(dashboardOptions.sessionSummaryWindowHours, d.dashboard.sessionSummaryWindowHours, 1),
    };

    const collection = o.collection ?? {};
    const includeDefaultExcludes = bool(collection.includeDefaultExcludes, d.collection.includeDefaultExcludes);
    const userExcludes = Array.isArray(collection.excludePaths)
        ? collection.excludePaths.filter((p): p is string => typeof p === 'string' && p.length > 0)
        : [...d.collection.excludePaths];
    const excludePaths = [...new Set([
        ...(includeDefaultExcludes ? DEFAULT_EXCLUDE_PATHS : []),
        ...(dashboard !== false ? [dashboard.path, `${dashboard.path}/**`] : []),
        ...userExcludes,
    ])];

    const persistenceOptions = enabled(o.persistence as ConfigOptions['persistence'] | true, true);
    const writer = persistenceOptions === false ? undefined : persistenceOptions.writer ?? {};
    const persistence: ReadonlyConfig['persistence'] = persistenceOptions === false ? false : {
        baseDir: str(persistenceOptions.baseDir, d.persistence.baseDir),
        persistRawRequests: bool(persistenceOptions.persistRawRequests, d.persistence.persistRawRequests),
        maxBufferSize: num(persistenceOptions.maxBufferSize, d.persistence.maxBufferSize, 1),
        archiveIntervalMs: num(persistenceOptions.archiveIntervalMs, d.persistence.archiveIntervalMs, 1000),
        heartbeatIntervalMs: num(persistenceOptions.heartbeatIntervalMs, d.persistence.heartbeatIntervalMs, 1000),
        shutdownDrainTimeoutMs: num(persistenceOptions.shutdownDrainTimeoutMs, d.persistence.shutdownDrainTimeoutMs, 0),
        writer: {
            maxQueue: num(writer?.maxQueue, d.persistence.writer.maxQueue, 1),
            maxRetries: num(writer?.maxRetries, d.persistence.writer.maxRetries, 0),
            retryDelayMs: num(writer?.retryDelayMs, d.persistence.writer.retryDelayMs, 1),
        },
    };

    const simulationOptions = enabled(o.simulation as ConfigOptions['simulation'] | true, false);
    const simulation: ReadonlyConfig['simulation'] = simulationOptions === false ? false : {
        intervalMs: num(simulationOptions.intervalMs, d.simulation.intervalMs, 1),
        requestsPerTick: num(simulationOptions.requestsPerTick, d.simulation.requestsPerTick, 1),
    };

    const thresholds = o.thresholds ?? {};
    const cache = o.cache ?? {};
    const incidents = o.incidents ?? {};
    const correlation = o.correlation ?? {};
    const transport = o.transport ?? {};

    const viewWindowBuckets = num(cache.viewWindowBuckets, d.cache.viewWindowBuckets, 1);
    const correlationMaxWindow = num(correlation.maxWindow, d.correlation.maxWindow, 1);
    const incidentWindow = num(incidents.windowIntervals, d.incidents.windowIntervals, 1);

    return {
        applicationVersion: str(o.applicationVersion, d.applicationVersion),
        logging: {
            consoleLog: bool(o.logging?.consoleLog, d.logging.consoleLog),
        },
        collection: {
            excludePaths,
            includeDefaultExcludes,
            bucketIntervalMs: num(collection.bucketIntervalMs, d.collection.bucketIntervalMs, 100),
            maxEndpointsPerBucket: num(collection.maxEndpointsPerBucket, d.collection.maxEndpointsPerBucket, 1),
            eventLoopResolutionMs: num(collection.eventLoopResolutionMs, d.collection.eventLoopResolutionMs, 1),
        },
        thresholds: {
            slowLatencyMs: num(thresholds.slowLatencyMs, d.thresholds.slowLatencyMs, 1),
            eventLoopLagMs: num(thresholds.eventLoopLagMs, d.thresholds.eventLoopLagMs, 1),
        },
        cache: {
            liveBuckets: Math.max(
                num(cache.liveBuckets, d.cache.liveBuckets, 1),
                viewWindowBuckets, correlationMaxWindow, incidentWindow
            ),
            viewWindowBuckets,
        },
        persistence,
        incidents: {
            windowIntervals: incidentWindow,
            minRequests: num(incidents.minRequests, d.incidents.minRequests, 1),
            serverErrorRate: num(incidents.serverErrorRate, d.incidents.serverErrorRate, 0, 1),
            recoveryRatio: num(incidents.recoveryRatio, d.incidents.recoveryRatio, 0, 1),
            pendingForMs: num(incidents.pendingForMs, d.incidents.pendingForMs, 0),
            recoveryForMs: num(incidents.recoveryForMs, d.incidents.recoveryForMs, 0),
            resolvedHoldMs: num(incidents.resolvedHoldMs, d.incidents.resolvedHoldMs, 0),
            historySize: num(incidents.historySize, d.incidents.historySize, 1),
        },
        correlation: {
            minCorrelation: num(correlation.minCorrelation, d.correlation.minCorrelation, 0.01, 0.99),
            alpha: num(correlation.alpha, d.correlation.alpha, 0.0001, 0.5),
            power: num(correlation.power, d.correlation.power, 0.5, 0.9999),
            strongThreshold: num(correlation.strongThreshold, d.correlation.strongThreshold, 0, 1),
            maxLag: num(correlation.maxLag, d.correlation.maxLag, 0),
            maxWindow: correlationMaxWindow,
            minCoverage: num(correlation.minCoverage, d.correlation.minCoverage, 0, 1),
            evaluateEveryIntervals: num(correlation.evaluateEveryIntervals, d.correlation.evaluateEveryIntervals, 1),
        },
        dashboard,
        transport: {
            socketPath: normalizePath(str(transport.socketPath, d.transport.socketPath)) + '/',
            cors: typeof transport.cors === 'string' || typeof transport.cors === 'boolean' ? transport.cors : d.transport.cors,
            pingTimeoutMs: num(transport.pingTimeoutMs, d.transport.pingTimeoutMs, 1000),
            maxHttpBufferSize: num(transport.maxHttpBufferSize, d.transport.maxHttpBufferSize, 1024),
        },
        publisher: {
            intervalMs: num(o.publisher?.intervalMs, d.publisher.intervalMs, 100),
        },
        tickIntervalMs: num(o.tickIntervalMs, d.tickIntervalMs, 10),
        simulation,
    };
}

export function toClientConfig(config: ReadonlyConfig): ClientConfig {
    const persistence = config.persistence === false ? false : {
        persistRawRequests: config.persistence.persistRawRequests,
        maxBufferSize: config.persistence.maxBufferSize,
        archiveIntervalMs: config.persistence.archiveIntervalMs,
        heartbeatIntervalMs: config.persistence.heartbeatIntervalMs,
        shutdownDrainTimeoutMs: config.persistence.shutdownDrainTimeoutMs,
    };
    return {
        applicationVersion: config.applicationVersion,
        collection: {
            bucketIntervalMs: config.collection.bucketIntervalMs,
            excludePaths: config.collection.excludePaths,
        },
        thresholds: config.thresholds,
        cache: { viewWindowBuckets: config.cache.viewWindowBuckets },
        persistence,
        incidents: config.incidents,
        correlation: config.correlation,
        dashboard: config.dashboard,
        publisher: config.publisher,
        tickIntervalMs: config.tickIntervalMs,
        simulation: config.simulation,
    };
}

export class ConfigManager {
    private static instance: ConfigManager;
    private config: ReadonlyConfig = deepFreeze(resolve());
    private initialized: boolean = false;

    private constructor() { }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public initialize(userOptions?: ConfigOptions): ReadonlyConfig {
        if (this.initialized) {
            if (userOptions !== undefined) {
                Logger.error('ConfigManager: already initialized, new options are ignored.');
            }
            return this.config;
        }
        this.config = deepFreeze(resolve(userOptions));
        this.initialized = true;
        return this.config;
    }

    public get(): ReadonlyConfig {
        return this.config;
    }
}

export const getConfig = (): ReadonlyConfig => ConfigManager.getInstance().get();
