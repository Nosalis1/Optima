import { DEFAULT_CONFIG, type ReadonlyConfig } from '../config';
import { LocalRepository, PersistenceRepository } from '../core/storage';
import { CollectorService } from '../core/telemetry/collector.service';
import { CorrelationService } from '../core/telemetry/correlation.service';
import { TelemetryService } from '../core/telemetry/telemetry.service';
import { DashboardService } from "../core/telemetry/dashboard.service";
import { AnalyticsService } from '../core/telemetry/analytics.service';
import { RuntimeService } from '../core/telemetry/runtime.service';
import { TelemetryQueryService } from '../core/telemetry/telemetry-query.service';
import Logger from '../core/telemetry/logger';
import { IncidentService } from '../core/telemetry/incident.service';
import { ApplicationEventManager } from '../core/organizers';

export interface OptimaRuntimeDependencies {
    config: ReadonlyConfig;
    storage: LocalRepository;
    persistence: PersistenceRepository;

    queries: TelemetryQueryService;

    dashboard: DashboardService;

    analytics: AnalyticsService;
    runtime: RuntimeService;

    collector: CollectorService;
    correlation: CorrelationService;
    incidents: IncidentService;
    telemetry: TelemetryService;
}

export function createOptimaRuntime(config: ReadonlyConfig): OptimaRuntimeDependencies {
    Logger.configure({ consoleLog: config.logging.consoleLog });
    const dashboardSettings = config.dashboard === false ? DEFAULT_CONFIG.dashboard : config.dashboard;

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

    const dashboard = new DashboardService(queries, () => persistence.sessionId, {
        liveWindow: dashboardSettings.liveWindow,
        backfillLimit: dashboardSettings.backfillLimit,
        maxBackfillAgeMs: dashboardSettings.maxBackfillAgeMs,
    });

    const analytics = new AnalyticsService(queries, config);
    const runtime = new RuntimeService(storage, config);

    const collector = new CollectorService(
        storage,
        dashboard,
        analytics,
        runtime,
        config
    );
    const correlation = new CorrelationService({
        queries,
        finding: {
            save: f => persistence.saveCorrelationFinding(f),
            find: id => persistence.findCorrelationFinding(id),
            get durable() { return persistence.isEnabled; },
        },
        identity: { sessionId: () => persistence.sessionId, instanceId: storage.bucket.instanceId },
    }, {
        ...config.correlation,
        analysisIntervalMs: config.collection.bucketIntervalMs,
    });
    const incidents = new IncidentService({
        queries,
        sessionId: () => persistence.sessionId,
        durable: () => persistence.isEnabled,
        related: metric => correlation.relatedFindings(metric),
        emit: event => ApplicationEventManager.instance?.emit(event),
    }, {
        ...config.incidents,
        p95LatencyMs: config.thresholds.slowLatencyMs,
        eventLoopLagMs: config.thresholds.eventLoopLagMs,
    });
    const telemetry = new TelemetryService(storage, config);

    return {
        config,
        storage,
        persistence,
        queries,
        collector,
        dashboard,
        analytics,
        runtime,
        correlation,
        incidents,
        telemetry
    };
}

export interface ShutdownSteps {
    stopIntake?: () => void | Promise<void>;
    stopProducers: () => void;
    emitShutdownEvent?: () => Promise<void>;
    closeTransport?: () => void | Promise<void>;
    drainTimeoutMs?: number;
}

export async function shutdownOptimaRuntime(deps: OptimaRuntimeDependencies, steps: ShutdownSteps): Promise<void> {
    const run = async (label: string, fn: () => unknown) => {
        try { await fn(); } catch (err) { Logger.error(`Shutdown step "${label}" failed:`, err); }
    };

    await run('stop intake', () => steps.stopIntake?.());

    const persistenceSettings = deps.config.persistence === false ? DEFAULT_CONFIG.persistence : deps.config.persistence;
    const drainTimeoutMs = steps.drainTimeoutMs ?? persistenceSettings.shutdownDrainTimeoutMs;
    const drained = await deps.telemetry.whenDrained(drainTimeoutMs);
    if (!drained) {
        Logger.error(`Shutdown: ${deps.telemetry.inFlightCount} request(s) still in flight after ${drainTimeoutMs}ms; closing anyway.`);
    }

    await run('stop producers', () => steps.stopProducers());
    await run('close last interval', () => deps.storage.closeLastInterval());
    await run('emit shutdown event', () => steps.emitShutdownEvent?.());
    await run('persistence shutdown', () => deps.persistence.shutdown());

    await run('dispose runtime collectors', () => deps.storage.dispose());
    await run('close transport', () => steps.closeTransport?.());
}
