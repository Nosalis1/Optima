import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MetricsModule } from 'apm-optima/nest';

@Module({
    imports: [
        MetricsModule.forRoot({
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
        })
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule { }