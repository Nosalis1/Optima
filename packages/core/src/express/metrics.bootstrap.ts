import {
    Server as HTTPServer
} from 'http';
import {
    ExpressWebSocketAdapter
} from './metrics-websocket.adapter';
import {
    collectorService
} from '../core/telemetry/collector.service';
import {
    TrafficSimulator
} from '../simulation/simulation';
import {
    MetricsPublisher
} from '../core/delivery';
import {
    correlationService
} from '../core/telemetry/correlation.service';
import { getConfig } from '../config';
import Logger from '../core/telemetry/logger';

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
        collectorService
    );

    websocket.init();

    const publisher = new MetricsPublisher(
        collectorService,
        websocket,
        config.publisher.intervalMs
    );

    publisher.start();

    const tickInterval = setInterval(() => {
        collectorService.tick();
        correlationService.tick();
    }, config.tickIntervalMs);

    Logger.debug('Metrics bootstrap initialized successfully.');

    return () => {
        simulator?.stop();

        publisher.stop();

        clearInterval(tickInterval);

        websocket.disconnect();
    };
}