import {
    Inject,
    Injectable,
    OnApplicationBootstrap,
    OnApplicationShutdown,
} from '@nestjs/common';
import { MetricsPublisher } from '../core/delivery';
import { TrafficSimulator } from '../simulation/simulation';
import { NestWebSocketAdapter } from './metrics-websocket.adapter';
import { type ReadonlyConfig } from '../config';
import Logger from '../core/telemetry/logger';
import { ApplicationEventManager, IntervalManager } from '../core/organizers';
import { createOptimaRuntime, type OptimaRuntimeDependencies } from '../runtime';

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
        @Inject('OPTIMA_RUNTIME_DEPENDENCIES')
        private readonly dependencies: OptimaRuntimeDependencies,
    ) { }

    onApplicationBootstrap(): void {
        if (!this.dependencies) {
            Logger.error('Failed to create Optima runtime dependencies.');
            return;
        }

        const simulationConfig = this.config.simulation === false
            ? null
            : this.config.simulation;

        if (simulationConfig) {
            this.simulator = new TrafficSimulator(this.dependencies!.storage);
            this.simulator.start(simulationConfig);
        }

        this.websocket.init();

        this.eventManager = new ApplicationEventManager(
            this.dependencies.persistence,
            this.config.applicationVersion
        );
        this.eventManager.start();

        this.publisher = new MetricsPublisher(
            this.dependencies.collector,
            this.dependencies.persistence,
            this.websocket,
        );

        this.intervalManager = new IntervalManager({
            tick: () => { this.dependencies!.collector.tick(); this.dependencies!.correlation.tick(); },
            publisher: () => { this.publisher?.publish(); this.dependencies!.persistence.onPublisherTick(this.publisher?.retrieveLastPublishedData() || null); },
            persistence: () => { this.dependencies!.persistence.archiveAllCategories(); }
        });

        this.intervalManager.startIntervals();

        Logger.debug('Nest metrics bootstrap initialized.');
        void ApplicationEventManager.instance?.emit({
            type: 'STARTUP',
            reason: 'Nest metrics module initialized',
        });
    }

    async onApplicationShutdown(): Promise<void> {
        await ApplicationEventManager.instance?.emit({
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