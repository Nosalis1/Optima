import {
    ConfigOptions,
    ReadonlyConfig
} from './config.types';

export class ConfigManager {
    private static instance: ConfigManager;
    private config!: ReadonlyConfig;

    private readonly defaultConfig: ReadonlyConfig =
        Object.freeze({
            dashboardPath: '/optima-metrics',

            simulation: {
                intervalMs: 100,
                requestsPerTick: 20,
            },
            publisher: {
                intervalMs: 1000,
                slowLatencyThresholdMs: 500,
                eventLoopLagThresholdMs: 100,
                eventLoopResolutionMs: 20,
            },
            tickIntervalMs: 250,
            excludePaths: [
                '/_next/*',
                '/_next/**',
                '*.map',
                '*.js',
                '*.css',
                '/favicon.ico',
                '/metrics_pack',
                '/health',
                '/optima-metrics/**',
                '/optima-metrics/*',
            ], //! OPTIMIZE THIS

            consoleLog: true,

            ringBufferSize: 60,
            alertBufferSize: 100,
        });

    private constructor() {
        this.config = this.defaultConfig;
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public initialize(
        userOptions?: ConfigOptions
    ): ReadonlyConfig {
        const validated = this.validateAndSanitize(userOptions);
        this.config = Object.freeze({
            ...this.defaultConfig,
            ...validated
        });
        return this.config;
    }

    public get(): ReadonlyConfig {
        return this.config;
    }

    private validateAndSanitize(
        options?: ConfigOptions
    ): ConfigOptions {
        if (!options) {
            return {};
        }

        const sanitized: Partial<ConfigOptions> = {};

        if (options.dashboardPath !== undefined) {
            if (options.dashboardPath === false) {
                sanitized.dashboardPath = false;
            } else {
                sanitized.dashboardPath = String(options.dashboardPath);
            }
        }

        if (options.simulation !== undefined) {
            if (typeof options.simulation === 'boolean') {
                sanitized.simulation = options.simulation;
            } else {
                sanitized.simulation = {
                    intervalMs: Math.max(1, options.simulation.intervalMs),
                    requestsPerTick: Math.max(1, options.simulation.requestsPerTick),
                };
            }
        }

        if (options.publisher !== undefined) {
            sanitized.publisher = {
                intervalMs: Math.max(1, options.publisher.intervalMs),
                slowLatencyThresholdMs: Math.max(1, options.publisher.slowLatencyThresholdMs),
                eventLoopLagThresholdMs: Math.max(1, options.publisher.eventLoopLagThresholdMs),
                eventLoopResolutionMs: options.publisher.eventLoopResolutionMs !== undefined
                    ? Math.max(1, options.publisher.eventLoopResolutionMs)
                    : undefined,
            };
        }

        if (options.tickIntervalMs !== undefined) {
            sanitized.tickIntervalMs = Math.max(1, options.tickIntervalMs);
        }

        if (Array.isArray(options.excludePaths)) {
            sanitized.excludePaths = options.excludePaths.filter(path => typeof path === 'string');
        }

        if (options.consoleLog !== undefined) {
            sanitized.consoleLog = Boolean(options.consoleLog);
        }

        if (options.ringBufferSize !== undefined) {
            sanitized.ringBufferSize = Math.max(1, options.ringBufferSize);
        }

        if (options.alertBufferSize !== undefined) {
            sanitized.alertBufferSize = Math.max(1, options.alertBufferSize);
        }

        return sanitized as ConfigOptions;
    }
}

export const getConfig = (): ReadonlyConfig => ConfigManager.getInstance().get();