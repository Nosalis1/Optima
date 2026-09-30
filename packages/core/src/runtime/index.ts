import type { ReadonlyConfig } from '../config/config.types';
import { LocalRepository, PersistenceRepository } from '../core/storage';
import { CollectorService } from '../core/telemetry/collector.service';
import { CorrelationService } from '../core/telemetry/correlation.service';
import { TelemetryService } from '../core/telemetry/telemetry.service';
import { DashboardService } from "../core/telemetry/dashboard.service";
import { AnalyticsService } from '../core/telemetry/analytics.service';
import { RuntimeService } from '../core/telemetry/runtime.service';

export interface OptimaRuntimeDependencies {
    storage: LocalRepository;
    persistence: PersistenceRepository;

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
    const correlation = new CorrelationService(storage);
    const telemetry = new TelemetryService(storage, config);

    return {
        storage,
        persistence,
        collector,
        dashboard,
        analytics,
        runtime,
        correlation,
        telemetry
    };
}