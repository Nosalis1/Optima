import { Server as HTTPServer } from 'http';
import { ExpressWebSocketAdapter } from './metrics-websocket.adapter';
import { TrafficSimulator } from '../simulation/simulation';
import { MetricsPublisher } from '../core/delivery';
import { getConfig } from '../config';
import Logger from '../core/telemetry/logger';
import { IntervalManager, ApplicationEventManager } from '../core/organizers';
import type { OptimaRuntimeDependencies } from '../runtime';

export function expressMetricsBootstrap(server: HTTPServer, dependencies: OptimaRuntimeDependencies): () => Promise<void> {
    const config = getConfig();

    let simulator: TrafficSimulator | null = null;
    if (config.simulation) {
        simulator = new TrafficSimulator(dependencies.storage);
        simulator.start({
            intervalMs: config.simulation.intervalMs,
            requestsPerTick: config.simulation.requestsPerTick,
        });
    }

    const websocket = new ExpressWebSocketAdapter(
        server,
        dependencies.collector,
        dependencies.persistence
    );

    websocket.init();

    const eventManager = new ApplicationEventManager(
        dependencies.persistence,
        config.applicationVersion
    );
    eventManager.start();

    const publisher = new MetricsPublisher(
        dependencies.collector,
        dependencies.persistence,
        websocket
    );

    const intervalManager = new IntervalManager({
        tick: () => { dependencies.collector.tick(); dependencies.correlation.tick(); },
        publisher: () => { publisher.publish(); dependencies.persistence.onPublisherTick(publisher.retrieveLastPublishedData() || null); },
        persistence: () => { dependencies.persistence.archiveAllCategories(); }
    }, config);

    intervalManager.startIntervals();

    Logger.debug('Metrics bootstrap initialized successfully.');
    void ApplicationEventManager.instance?.emit({
        type: 'STARTUP',
        reason: 'Express metrics module initialized',
    });

    return async () => {
        await ApplicationEventManager.instance?.emit({
            type: 'SHUTDOWN',
            reason: 'Express metrics module shutting down',
        });

        intervalManager.stopIntervals();

        eventManager.stop();

        simulator?.stop();

        websocket.disconnect();
    };
}