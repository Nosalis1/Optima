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
import { type ReadonlyConfig } from '../config';
import Logger from '../core/telemetry/logger';
import { persistence } from '../core/storage';
import { ApplicationEventManager, IntervalManager } from '../core/organizers';

@Injectable()
export class MetricsBootstrapService
    implements OnApplicationBootstrap, OnApplicationShutdown {
    private simulator: TrafficSimulator | null = null;
    private publisher: MetricsPublisher | null = null;
    private intervalManager: IntervalManager | null = null;
    private eventManager: ApplicationEventManager | null = null;

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

        this.eventManager = new ApplicationEventManager(
            persistence,
            this.config.applicationVersion
        );
        this.eventManager.start();

        this.publisher = new MetricsPublisher(
            collectorService,
            persistence,
            this.websocket,
        );

        this.intervalManager = new IntervalManager(
            () => { collectorService.tick(); correlationService.tick(); },
            () => { this.publisher?.publish(); persistence.onPublisherTick(this.publisher?.retrieveLastPublishedData() || null); },
            () => { persistence.archiveAllCategories(); }
        );

        this.intervalManager.startIntervals();

        Logger.debug('Nest metrics bootstrap initialized.');
        ApplicationEventManager.instance?.emit({
            type: 'STARTUP',
            reason: 'Nest metrics module initialized',
        });
    }

    onApplicationShutdown(): void {
        ApplicationEventManager.instance?.emit({
            type: 'SHUTDOWN',
            reason: 'Nest metrics module shutting down',
        });

        this.intervalManager?.stopIntervals();
        this.intervalManager = null;

        this.eventManager?.stop();
        this.eventManager = null;

        this.simulator?.stop();
        this.simulator = null;

        this.publisher = null;

        this.websocket.disconnect();
    }
}