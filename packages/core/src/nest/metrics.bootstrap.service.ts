import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from '@nestjs/common';

import { collectorService } from '../core/telemetry/collector.service';
import { correlationService } from '../core/telemetry/correlation.service';
import { MetricsPublisher } from '../core/delivery';
import { TrafficSimulator } from '../simulation/simulation';
import { NestWebSocketAdapter } from './metrics-websocket.adapter';
import {
    type ReadonlyConfig
} from '../config';

@Injectable()
export class MetricsBootstrapService
    implements OnApplicationBootstrap, OnApplicationShutdown {
    private simulator: TrafficSimulator | null = null;
    private publisher: MetricsPublisher | null = null;
    private tickInterval: NodeJS.Timeout | null = null;

    constructor(
        private readonly websocket: NestWebSocketAdapter,
        @Inject('METRICS_CONFIG')
        private readonly config: ReadonlyConfig,
    ) { }

    onApplicationBootstrap(): void {
        const simulationConfig = this.config.simulation === false
            ? null
            : this.config.simulation;

        if (simulationConfig) {
            this.simulator = new TrafficSimulator();
            this.simulator.start(simulationConfig);
        }

        this.websocket.init();

        this.publisher = new MetricsPublisher(
            collectorService,
            this.websocket,
            this.config.publisher.intervalMs
        );
        this.publisher.start();

        this.tickInterval = setInterval(() => {
            collectorService.tick();
            correlationService.tick();
        }, this.config.tickIntervalMs);

        console.log('[Optima] Nest metrics bootstrap initialized.');
    }

    onApplicationShutdown(): void {
        this.simulator?.stop();
        this.simulator = null;

        this.publisher?.stop();
        this.publisher = null;

        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }

        this.websocket.disconnect();
    }
}