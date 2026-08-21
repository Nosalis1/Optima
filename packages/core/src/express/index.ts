import express from 'express';
import { Server as HTTPServer } from 'http';
import {
    ConfigManager,
    type ConfigOptions
} from '../config';
import { expressMetricsMiddleware } from './metrics.middleware';
import { attachDashboard } from './metrics.dashboard';
import { expressMetricsBootstrap } from './metrics.bootstrap';

export function setupOptima(
    app: express.Express,
    options?: ConfigOptions
) {
    ConfigManager.getInstance().initialize(options);
    const config = ConfigManager.getInstance().get();

    // Registering the metrics middleware
    app.use(expressMetricsMiddleware);

    // Attaching the dashboard on provided path
    if (config.dashboardPath !== false) {
        attachDashboard(app, config.dashboardPath);
    }

    return {
        attachServer: (server: HTTPServer) => {
            return expressMetricsBootstrap(server);
        }
    };
}