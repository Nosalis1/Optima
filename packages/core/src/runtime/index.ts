import type { ReadonlyConfig } from '../config/config.types';
import { LocalRepository, PersistenceRepository } from '../core/storage';
import { CollectorService } from '../core/telemetry/collector.service';
import { CorrelationService } from '../core/telemetry/correlation.service';
import { TelemetryService } from '../core/telemetry/telemetry.service';

export interface OptimaRuntimeDependencies {
    storage: LocalRepository;
    persistence: PersistenceRepository;
    collector: CollectorService;
    correlation: CorrelationService;
    telemetry: TelemetryService;
}

export function createOptimaRuntime(config: ReadonlyConfig): OptimaRuntimeDependencies {
    const persistence = new PersistenceRepository(config);
    const storage = new LocalRepository(persistence, config);
    const collector = new CollectorService(storage, config);
    const correlation = new CorrelationService(storage);
    const telemetry = new TelemetryService(storage, config);

    return { storage, persistence, collector, correlation, telemetry };
}