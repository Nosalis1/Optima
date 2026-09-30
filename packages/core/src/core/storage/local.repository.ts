import { randomUUID } from 'crypto';
import type { TelemetryRequest } from '../domain';
import type { ReadonlyConfig } from '../../config';
import { BucketStore, AlertStore, } from './stores';
import { ApplicationEventManager } from '../organizers';
import { PersistenceRepository } from './persistence.layer';
import { AnomalyDetector } from './runtime/anomaly-detector';
import { RuntimeStore } from './stores/runtime.store';

export class LocalRepository {
    readonly alerts: AlertStore;
    readonly bucket: BucketStore;
    readonly runtime: RuntimeStore;

    private readonly anomaly = new AnomalyDetector();

    constructor(
        private readonly persistence: PersistenceRepository,
        private readonly config: ReadonlyConfig
    ) {
        this.alerts = new AlertStore(config.alertBufferSize);
        this.runtime = new RuntimeStore(config);
        this.bucket = new BucketStore(
            this.runtime,
            {
                sessionId: persistence.sessionId,
                instanceId: randomUUID(),
                intervalMs: 1000,
                historySize: config.ringBufferSize,
            }
        );
    }

    record(request: TelemetryRequest): void {
        this.bucket.record({
            method: request.method,
            route: request.endpoint,
            duration: request.responseTime,
            statusCode: request.statusCode
        });

        if (this.anomaly.record(request.responseTime)) {
            const reason = `Slow request: ${request.method} ${request.endpoint} took ${request.responseTime}ms`;
            this.alerts.warning(`Anomaly detected: ${reason}`);
            void ApplicationEventManager.instance?.emit({ type: 'ANOMALY', reason });
        }

        this.persistence.onHttpRequest({
            method: request.method,
            path: request.endpoint,
            statusCode: request.statusCode,
            durationMs: request.responseTime,
            timestamp: new Date(request.timestamp).toISOString()
        });
    }

    tick(): void { this.closeInterval(false); }

    closeLastInterval(): void { this.closeInterval(true); }

    private closeInterval(force: boolean): void {
        const bucket = this.bucket.flush({ force });
        if (!bucket) return;
        void this.persistence.onBucketClosed(bucket)
            .then(ok => {
                if (ok) this.bucket.markCommitted(bucket.sequence);
            });
    }
}