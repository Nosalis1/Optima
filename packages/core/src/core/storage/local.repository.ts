import { randomUUID } from 'crypto';
import type { TelemetryRequest } from '../domain';
import type { ReadonlyConfig } from '../../config';
import { BucketStore } from './stores';
import { PersistenceRepository } from './persistence.layer';
import { RuntimeStore } from './stores/runtime.store';

export class LocalRepository {
    readonly bucket: BucketStore;
    readonly runtime: RuntimeStore;

    constructor(
        private readonly persistence: PersistenceRepository,
        private readonly conf: ReadonlyConfig
    ) {
        this.runtime = new RuntimeStore(conf);
        this.bucket = new BucketStore(
            this.runtime,
            {
                sessionId: persistence.sessionId,
                instanceId: randomUUID(),
                intervalMs: conf.collection.bucketIntervalMs,
                historySize: conf.cache.liveBuckets,
                maxEndpoints: conf.collection.maxEndpointsPerBucket,
            }
        );
    }

    record(request: TelemetryRequest): void {
        this.bucket.record({
            method: request.method,
            route: request.endpoint,
            duration: request.responseTime,
            statusCode: request.statusCode,
            origin: request.origin
        });

        this.persistence.onHttpRequest({
            method: request.method,
            path: request.endpoint,
            statusCode: request.statusCode,
            durationMs: request.responseTime,
            timestamp: new Date(request.timestamp).toISOString()
        });
    }

    tick(): void { void this.closeInterval(false); }

    closeLastInterval(): Promise<void> { return this.closeInterval(true); }

    dispose(): void { this.runtime.dispose(); }

    private async closeInterval(final: boolean): Promise<void> {
        const bucket = this.bucket.flush({ force: final, seal: final });
        if (!bucket) return;
        const ok = await this.persistence.onBucketClosed(bucket);
        if (ok) this.bucket.markCommitted(bucket.sequence);
    }
}