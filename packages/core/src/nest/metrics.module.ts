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
        const staticAssetsPath = path.resolve(__dirname, '../../../dashboard/out');

        consumer
            .apply(
                express.static(staticAssetsPath),
                (
                    req: express.Request,
                    res: express.Response,
                    next: express.NextFunction
                ) => {
                    // SPA Fallback
                    if (!req.path.includes('.')) {
                        return res.sendFile(path.join(staticAssetsPath, 'index.html'));
                    }
                    next();
                }
            )
            .forRoutes(dashboardRoute);
    }
}
