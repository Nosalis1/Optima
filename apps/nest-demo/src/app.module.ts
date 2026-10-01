import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsModule } from 'apm-optima/nest';

@Module({
    imports: [
        MetricsModule.forRoot({
            dashboard: {
                path: '/optima-metrics',
            },
            simulation: {
                intervalMs: 200,
                requestsPerTick: 250,
            },
            publisher: {
                intervalMs: 1000,
            },
            persistence: {
                baseDir: 'metrics_data',
                maxBufferSize: 1000,
                persistRawRequests: true,
            },
            tickIntervalMs: 250,
        })
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }