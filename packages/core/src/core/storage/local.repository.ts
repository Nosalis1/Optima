import type { TelemetryRequest } from '../domain';
import { getConfig } from '../../config';
import {
    BucketStore,
    DashboardStore,
    AnalyticsStore,
    HealthStore,
    SystemStore,
    EndpointStore,
    AlertStore,
    MetricsStore
} from './stores';
import { ApplicationEventManager } from '../organizers';
import { persistence, PersistenceLayer } from './persistence.layer';

class LocalRepository {
    // Standard Stores
    readonly endpoint: EndpointStore;
    readonly alerts: AlertStore;
    readonly metrics: MetricsStore;

    // Historics Store
    readonly health: HealthStore;
    readonly bucket: BucketStore;

    // Core Stores
    readonly dashboard: DashboardStore;
    readonly analytics: AnalyticsStore;
    readonly system: SystemStore;

    // Persistence
    readonly persistence: PersistenceLayer = persistence;

    constructor() {
        const config = getConfig();

        // Standard 
        this.endpoint = new EndpointStore();
        this.alerts = new AlertStore(
            config.alertBufferSize
        );
        this.metrics = new MetricsStore();

        // Historic
        this.health = new HealthStore(
            config.ringBufferSize,
            config.publisher.eventLoopLagThresholdMs
        );
        this.bucket = new BucketStore(
            this.endpoint,
            this.health,
            this.metrics,
            config.ringBufferSize
        );

        this.dashboard = new DashboardStore(
            this.bucket,
            this.health,
            this.endpoint,
            this.alerts
        );
        this.analytics = new AnalyticsStore(
            this.bucket,
            this.endpoint,
            config.publisher.slowLatencyThresholdMs
        );
        this.system = new SystemStore();
    }

    record(request: TelemetryRequest): void {
        const data = {
            method: request.method,
            route: request.endpoint,
            duration: request.responseTime,
            statusCode: request.statusCode
        };

        this.endpoint.record(data);

        const status = this.metrics.record({
            duration: request.responseTime,
            statusCode: request.statusCode
        });

        if (status === 'ANOMALY') {
            const reason = `Slow request: ${request.method} ${request.endpoint} took ${request.responseTime}ms`;
            this.alerts.warning(`Anomaly detected: ${reason}`);
            void ApplicationEventManager.instance?.emit({
                type: 'ANOMALY',
                reason
            });
        }

        this.bucket.recordRequest(
            request.method,
            request.endpoint
        );

        this.persistence.onHttpRequest({
            method: request.method,
            path: request.endpoint,
            statusCode: request.statusCode,
            durationMs: request.responseTime,
            timestamp: new Date(request.timestamp).toISOString()
        });
    }

    tick(): void {
        this.bucket.flush();
    }
}

export const storage = new LocalRepository();