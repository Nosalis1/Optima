import { Server as HTTPServer } from 'http';
import { ExpressWebSocketAdapter } from './metrics-websocket.adapter';
import { collectorService } from '../core/telemetry/collector.service';
import { TrafficSimulator } from '../simulation/simulation';
import { MetricsPublisher } from '../core/delivery';
import { correlationService } from '../core/telemetry/correlation.service';
import { getConfig } from '../config';
import Logger from '../core/telemetry/logger';
import { persistence } from '../core/storage';
import { IntervalManager, ApplicationEventManager } from '../core/organizers';

export function expressMetricsBootstrap(server: HTTPServer) {
    const config = getConfig();

    let simulator: TrafficSimulator | null = null;
    if (config.simulation) {
        simulator = new TrafficSimulator();
        simulator.start({
            intervalMs: config.simulation.intervalMs,
            requestsPerTick: config.simulation.requestsPerTick,
        });
    }

    const websocket = new ExpressWebSocketAdapter(
        server,
        collectorService,
        persistence
    );

    websocket.init();

    const eventManager = new ApplicationEventManager(
        persistence,
        config.applicationVersion
    );
    eventManager.start();

    const publisher = new MetricsPublisher(
        collectorService,
        persistence,
        websocket
    );

    const intervalManager = new IntervalManager({
        tick: () => { collectorService.tick(); correlationService.tick(); },
        publisher: () => { publisher.publish(); persistence.onPublisherTick(publisher.retrieveLastPublishedData() || null); },
        persistence: () => { persistence.archiveAllCategories(); }
    });

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