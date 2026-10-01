import type { ReadonlyConfig } from '../config/config.types';
import { LocalRepository, PersistenceRepository } from '../core/storage';
import { CollectorService } from '../core/telemetry/collector.service';
import { CorrelationService } from '../core/telemetry/correlation.service';
import { TelemetryService } from '../core/telemetry/telemetry.service';
import { DashboardService } from "../core/telemetry/dashboard.service";
import { AnalyticsService } from '../core/telemetry/analytics.service';
import { RuntimeService } from '../core/telemetry/runtime.service';
import { TelemetryQueryService } from '../core/telemetry/telemetry-query.service';

export interface OptimaRuntimeDependencies {
    storage: LocalRepository;
    persistence: PersistenceRepository;

    queries: TelemetryQueryService;

    dashboard: DashboardService;
    analytics: AnalyticsService;
    runtime: RuntimeService;

    collector: CollectorService;
    correlation: CorrelationService;
    telemetry: TelemetryService;
}

export function createOptimaRuntime(config: ReadonlyConfig): OptimaRuntimeDependencies {
    const persistence = new PersistenceRepository(config);
    const storage = new LocalRepository(persistence, config);

    const queries = new TelemetryQueryService({
        committed: persistence.bucketSource,
        live: {
            snapshot: () => storage.bucket.getHistory().map(bucket => ({
                bucket,
                committed: storage.bucket.isCommitted(bucket.sequence)
            })),
        },
        currentSessionId: () => persistence.sessionId
    });
    persistence.attachQueryService(queries);

    const dashboard = new DashboardService(storage);
    const analytics = new AnalyticsService(storage, config);
    const runtime = new RuntimeService(storage, config);

    const collector = new CollectorService(
        storage,
        dashboard,
        analytics,
        runtime,
        config
    );
    const correlation = new CorrelationService(storage, {
        queries,
        finding: { save: f => persistence.saveCorrelationFinding(f) },
        identity: { sessionId: () => persistence.sessionId, instanceId: storage.bucket.instanceId },
    }, { transform: 'raw', scopes: [{}] });
    const telemetry = new TelemetryService(storage, config);

    return {
        storage,
        persistence,
        queries,
        collector,
        dashboard,
        analytics,
        runtime,
        correlation,
        telemetry
    };
}