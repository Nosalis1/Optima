import express from 'express';
import { Server as HTTPServer } from 'http';
import {
    ConfigManager,
    type ConfigOptions
} from '../config';
import { expressMetricsMiddleware } from './metrics.middleware';
import { attachDashboard } from './metrics.dashboard';
import { expressMetricsBootstrap } from './metrics.bootstrap';
import Logger from '../core/telemetry/logger';

export function setupOptima(
    app: express.Express,
    options?: ConfigOptions
) {
    Logger.debug('Initializing Optima with provided configuration options...');

    ConfigManager.getInstance().initialize(options);
    const config = ConfigManager.getInstance().get();

    // Registering the metrics middleware
    app.use(expressMetricsMiddleware);

    Logger.debug('Middlware for metrics collection has been registered successfully.');

    // Attaching the dashboard on provided path
    if (config.dashboardPath !== false) {
        attachDashboard(app, config.dashboardPath);

        Logger.debug(`Dashboard has been attached at path: ${config.dashboardPath}`);
    } else {
        Logger.debug('Dashboard attachment skipped as per configuration.');
    }

    return {
        attachServer: (server: HTTPServer) => {
            Logger.debug('Attaching server for metrics collection...');
            return expressMetricsBootstrap(server);
        }
    };
}