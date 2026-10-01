import express from 'express';
import path from 'path';
import {
    Global,
    Module,
    DynamicModule,
    NestModule,
    MiddlewareConsumer,
    Inject,
    RequestMethod,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { MetricsInterceptor } from './metrics.interceptor';
import { NestAdapter } from './metrics.adapter';
import { NestWebSocketAdapter } from './metrics-websocket.adapter';
import { MetricsBootstrapService } from './metrics.bootstrap.service';
import {
    ConfigOptions,
    ConfigManager,
} from '../config';
import fs from 'fs';
import Logger from '../core/telemetry/logger';
import { createOptimaRuntime, type OptimaRuntimeDependencies } from '../runtime';
import { createSessionExportHandler, sessionExportRoute } from '../adapters/session-export.handler';

@Global()
@Module({
    providers: [
        NestAdapter,
        NestWebSocketAdapter,
        MetricsBootstrapService,
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor
        },
    ],
    exports: ['METRICS_CONFIG', 'OPTIMA_RUNTIME_DEPENDENCIES'],
})
export class MetricsModule implements NestModule {
    constructor(
        @Inject('OPTIMA_RUNTIME_DEPENDENCIES')
        private readonly dependencies: OptimaRuntimeDependencies,
    ) { }

    static forRoot(options?: ConfigOptions): DynamicModule {
        ConfigManager.getInstance().initialize(options);
        const dependencies = createOptimaRuntime(ConfigManager.getInstance().get());

        return {
            module: MetricsModule,
            providers: [
                {
                    provide: 'METRICS_CONFIG',
                    useValue: ConfigManager.getInstance().get(),
                },
                {
                    provide: 'OPTIMA_RUNTIME_DEPENDENCIES',
                    useValue: dependencies,
                }
            ],
            exports: ['METRICS_CONFIG'],
        };
    }

    configure(consumer: MiddlewareConsumer) {
        const config = this.dependencies.config;

        if (config.dashboard === false) {
            return;
        }

        const dashboardRoute = config.dashboard.path;

        const dashboardDir = path.join(__dirname, '../../dashboard-out');
        const indexHtmlPath = path.join(dashboardDir, 'index.html');

        if (!fs.existsSync(indexHtmlPath)) {
            Logger.error(`Dashboard not found at ${indexHtmlPath}. Please build the dashboard first.`);
            return;
        }

        consumer
            .apply(createSessionExportHandler(this.dependencies.persistence))
            .forRoutes({ path: sessionExportRoute(dashboardRoute), method: RequestMethod.GET });

        consumer
            .apply(
                express.static(dashboardDir),
                (
                    req: express.Request,
                    res: express.Response,
                    next: express.NextFunction
                ) => {
                    // SPA Fallback
                    if (!req.path.includes('.')) {
                        return res.sendFile(indexHtmlPath);
                    }
                    next();
                }
            )
            .forRoutes(dashboardRoute);
    }
}
