import express from 'express';
import path from 'path';
import {
    Global,
    Module,
    DynamicModule,
    NestModule,
    MiddlewareConsumer,
} from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";

import { MetricsInterceptor } from './metrics.interceptor';
import { NestAdapter } from './metrics.adapter';
import { NestWebSocketAdapter } from './metrics-websocket.adapter';
import { MetricsBootstrapService } from './metrics.bootstrap.service';
import TelemetryService from '../core/telemetry/telemetry.service';
import {
    ConfigOptions,
    ConfigManager,
} from '../config';
import fs from 'fs';
import Logger from '../core/telemetry/logger';

@Global()
@Module({
    providers: [
        TelemetryService,
        NestAdapter,
        NestWebSocketAdapter,
        MetricsBootstrapService,
        {
            provide: APP_INTERCEPTOR,
            useClass: MetricsInterceptor
        },
    ],
    exports: [
        TelemetryService,
    ],
})
export class MetricsModule implements NestModule {
    static forRoot(options?: ConfigOptions): DynamicModule {
        ConfigManager.getInstance().initialize(options);
        return {
            module: MetricsModule,
            providers: [
                {
                    provide: 'METRICS_CONFIG',
                    useValue: ConfigManager.getInstance().get(),
                }
            ],
            exports: ['METRICS_CONFIG'],
        };
    }

    configure(consumer: MiddlewareConsumer) {
        const config = ConfigManager.getInstance().get();

        if (config.dashboardPath === false) {
            return;
        }

        const dashboardRoute = config.dashboardPath;

        const dashboardDir = path.join(__dirname, '../../dashboard-out');
        const indexHtmlPath = path.join(dashboardDir, 'index.html');

        if (!fs.existsSync(indexHtmlPath)) {
            Logger.error(`Dashboard not found at ${indexHtmlPath}. Please build the dashboard first.`);
            return;
        }

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
