import path from "path";
import fs from 'fs/promises';
import { randomUUID } from "crypto";
import { ReadonlyConfig } from "../../config";
import {
    readRecords,
    cleanupOrphanedTempFiles,
    writeChecksum,
    archiveFile
} from "./utility";
import type {
    AnalyticsData,
    ApplicationEvent,
    DashboardData,
    HealthData,
    SystemStaticInfo,
    SessionSummary,
    HourlyBucket,
    CorrelationData,
    SessionRecord,
    SessionManifest
} from "../domain";
import {
    PersistenceWriter,
    dedupeRecords,
    type RecordInput,
    type StorageStatus,
    type PersistenceCategory
} from './persistence/persistence-writer';
import { SessionRegistry } from './persistence/session-registry';
import { ApplicationEventManager } from "../organizers";
import Logger from "../telemetry/logger";
import type { MetricBucket } from "./stores/bucket-metric";

type HttpMetricRecord = {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    timestamp: string;
};

type HealthSnapshotRecord = {
    systemStaticInfo: SystemStaticInfo;
    dashboardData: DashboardData;
    analyticsData: AnalyticsData;
    healthData: HealthData;
    correlationData: CorrelationData;
};

interface HourBucketAccumulator {
    clientErrorCount: number;
    serverErrorCount: number;
    rpsSum: number;
    rpsMax: number;
    latencySum: number;
    latencyMax: number;
    healthyEndpointCount: number;
    slowEndpointCount: number;
    sampleCount: number;
};

const HEARTBEAT_INTERVAL_MS = 30_000;

const hourKeyFor = (date: Date | string): string => {
    if (typeof date === 'string') date = new Date(date);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())).toISOString();
}

export class PersistenceRepository {
    private httpBuffer: RecordInput<HttpMetricRecord>[] = [];
    private readonly enabled: boolean;
    private readonly maxBufferSize: number;
    private readonly baseDir: string;
    private readonly persistRawRequests: boolean;

    private readonly writer: PersistenceWriter;
    private readonly registry: SessionRegistry;
    private readonly ready: Promise<SessionRecord | null>;
    private heartbeatTimer: NodeJS.Timeout | null = null;

    private shutdownPromise: Promise<void> | null = null;

    readonly sessionId = randomUUID();

    constructor(
        private readonly config: ReadonlyConfig
    ) {
        if (typeof config.persistence === 'boolean') {
            this.enabled = config.persistence;
            this.baseDir = './metrics_data';
            this.maxBufferSize = 200;
            this.persistRawRequests = false;
        } else {
            this.enabled = true;
            this.baseDir = config.persistence.baseDir;
            this.maxBufferSize = config.persistence.maxBufferSize ?? 200;
            this.persistRawRequests = config.persistence.persistRawRequests ?? false;
        }

        this.writer = new PersistenceWriter({
            onStatusChange: (status) => Logger.error(`PersistenceLayer: storage status is now ${status}`)
        });
        this.registry = new SessionRegistry(path.join(this.baseDir, 'session-manifest.json'), this.writer);

        this.ready = this.initSession().catch(err => {
            Logger.error('Failed to initialize session:', err);
            return null;
        });
    }

    //#region Initialization

    private async initSession(): Promise<SessionRecord | null> {
        if (!this.enabled) return null;

        const removed = await cleanupOrphanedTempFiles(this.baseDir);
        if (removed > 0) {
            Logger.debug(`PersistenceLayer: Removed ${removed} orphaned temporary files during initialization.`);
        }

        const session = await this.registry.start(this.sessionId);
        Logger.debug(`Session initialized: #${session.sessionNumber} (${session.sessionId}), recoveredFromCrash=${this.registry.recoveredFromCrash}`);

        if (this.registry.recoveredFromCrash) {
            void ApplicationEventManager.instance?.emit({
                type: 'CRASH',
                reason: 'Application recovered from an unexpected shutdown',
            });
        }

        this.heartbeatTimer = setInterval(() => { void this.registry.heartbeat(); }, HEARTBEAT_INTERVAL_MS);
        this.heartbeatTimer.unref();

        return session;
    }

    //#endregion

    //#region Writing Metrics

    private async enqueue<T>(category: PersistenceCategory, items: RecordInput<T>[]): Promise<void> {
        try {
            await this.writer.enqueueAppend(this.baseDir, category, items);
            this.registry.notePersisted();
        } catch {
            // do nothing
        }
    }

    onHttpRequest(metric: HttpMetricRecord): void {
        if (!this.enabled || !this.persistRawRequests) return;
        if (metric.statusCode < 400) return; // Only persisting errors for now

        this.httpBuffer.push({ recordId: randomUUID(), payload: metric });

        if (this.httpBuffer.length >= this.maxBufferSize) {
            void this.flushHttpBuffer();
        }
    }

    async flushHttpBuffer(): Promise<void> {
        if (!this.enabled || this.httpBuffer.length === 0) return;
        const batch = this.httpBuffer;
        this.httpBuffer = [];
        await this.enqueue('http_requests', batch);
    }

    async onBucketClosed(bucket: MetricBucket): Promise<boolean> {
        if (!this.enabled) return false;
        const session = await this.ready;
        if (!session) return false;
        try {
            //! Change after next step, write the whole bucket instead of analized data
            // await this.writer.enqueueAppend(this.baseDir, 'metric_buckets', [{ recordId: bucket.bucketId, payload: bucket }]);
            // this.registry.notePersisted(bucket.sequence);
            return true;
        } catch {
            return false;
        }
    }

    //! Deprecated, as we will persist the whole bucket instead of analized data
    // TODO: Change in next step
    async onPublisherTick(snapshot: HealthSnapshotRecord | null): Promise<void> {
        if (!this.enabled || snapshot === null) return;
        const session = await this.ready;
        if (!session) return;

        const { systemStaticInfo, dashboardData, analyticsData, healthData, correlationData } = snapshot;
        const { history: dashboardHistory, charts, ...safeDashboardData } = dashboardData;
        const { latencyDistribution, requestVolume, endpointsTable, history: analyticsHistory, ...safeAnalyticsData } = analyticsData;
        const data = { systemStaticInfo, dashboardData: safeDashboardData, analyticsData: safeAnalyticsData, healthData };

        const tick = new Date().toISOString();
        await Promise.all([
            this.enqueue('system_health', [{ recordId: `${session.sessionId}:health:${tick}`, payload: data }]),
            this.enqueue('correlation', [{ recordId: `${session.sessionId}:correlation:${tick}`, payload: correlationData }]),
            this.flushHttpBuffer(),
        ]);
    }

    async onApplicationEvent(event: ApplicationEvent): Promise<void> {
        if (!this.enabled) return;
        const session = await this.ready;
        if (!session) return;

        const eventId = randomUUID();
        await this.enqueue('events', [{ recordId: eventId, payload: event }]);
    }

    getStorageStatus(): { status: StorageStatus; lostRecords: number; pending: number } {
        return {
            status: this.writer.status,
            lostRecords: this.writer.lostRecords,
            pending: this.writer.pending
        };
    }

    //#endregion

    //#region Reading Metrics

    async getSessionManifest(): Promise<SessionManifest> {
        if (!this.enabled) return { version: 2, sessions: [] };
        await this.ready;
        return { version: 2, sessions: [...this.registry.all] };
    }

    getSessionRecord(): SessionRecord | null {
        if (!this.enabled) {
            return {
                sessionId: 'disabled',
                sessionNumber: 0,
                startedAt: new Date().toISOString(),
                endedAt: null,
                lastPersistedAt: null,
                lastCommitedSequence: 0,
                status: 'RUNNING'
            };
        }
        return this.registry.current;
    }

    async findSession(sessionNumber: number): Promise<SessionRecord | null> {
        await this.ready;
        return this.registry.all.find(s => s.sessionNumber === sessionNumber) ?? null;
    }

    private async resolveExistingFile(category: PersistenceCategory, date: string): Promise<string | null> {
        const dir = path.join(this.baseDir, category);
        const plain = path.join(dir, `${date}.ndjson`);
        const gz = `${plain}.gz`;

        if (await fs.access(plain).then(() => true).catch(() => false)) return plain;
        if (await fs.access(gz).then(() => true).catch(() => false)) return gz;
        return null;
    }

    async getSessionSummary(sessionNumber: number, windowHours = 24): Promise<SessionSummary | null> {
        const session = await this.findSession(sessionNumber);
        if (!session) return null;

        const window = SessionRegistry.window(session);
        const windowStartCandidate = new Date(window.end.getTime() - windowHours * 60 * 60 * 1000);
        window.start = windowStartCandidate > window.start ? windowStartCandidate : window.start;

        const dates = SessionRegistry.enumerateDates(window);

        const hourly = new Map<string, HourBucketAccumulator>();
        for (const hourKey of SessionRegistry.enumerateHours(window)) {
            hourly.set(hourKey, {
                clientErrorCount: 0, serverErrorCount: 0,
                rpsSum: 0, rpsMax: 0,
                latencySum: 0, latencyMax: 0,
                healthyEndpointCount: 0, slowEndpointCount: 0,
                sampleCount: 0
            });
        }

        let clientErrorCount = 0, serverErrorCount = 0;
        let rpsSum = 0, rpsMax = 0;
        let latencySum = 0, latencyMax = 0;
        let sampleCount = 0;

        for (const date of dates) {
            const httpPath = await this.resolveExistingFile('http_requests', date);
            if (httpPath) {
                for await (const record of dedupeRecords(readRecords<HttpMetricRecord>(httpPath))) {
                    const ts = new Date(record.payload.timestamp);
                    if (ts < window.start || ts > window.end) continue;

                    const bucket = hourly.get(hourKeyFor(ts));
                    const isServerError = record.payload.statusCode >= 500;
                    const isClientError = record.payload.statusCode >= 400 && record.payload.statusCode < 500;

                    if (isServerError) {
                        serverErrorCount++;
                        if (bucket) bucket.serverErrorCount++;
                    } else if (isClientError) {
                        clientErrorCount++;
                        if (bucket) bucket.clientErrorCount++;
                    }
                }
            }

            const healthPath = await this.resolveExistingFile('system_health', date);
            if (healthPath) {
                for await (const record of dedupeRecords(readRecords<HealthSnapshotRecord>(healthPath))) {
                    const ts = new Date(record.createdAt);
                    if (ts < window.start || ts > window.end) continue;

                    const rps = record.payload.dashboardData.current.rps;
                    const latency = record.payload.dashboardData.current.latency;

                    rpsSum += rps;
                    rpsMax = Math.max(rpsMax, rps);

                    latencySum += latency;
                    latencyMax = Math.max(latencyMax, latency);

                    sampleCount++;

                    const bucket = hourly.get(hourKeyFor(ts));
                    if (bucket) {
                        bucket.rpsSum += rps;
                        bucket.rpsMax = Math.max(bucket.rpsMax, rps);
                        bucket.latencySum += latency;
                        bucket.latencyMax = Math.max(bucket.latencyMax, latency);
                        bucket.healthyEndpointCount += record.payload.analyticsData.summary.healthyEndpoints;
                        bucket.slowEndpointCount += record.payload.analyticsData.summary.slowEndpoints;
                        bucket.sampleCount++;
                    }
                }
            }
        }

        const perHour: HourlyBucket[] = Array.from(hourly.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([hourStart, acc]) => ({
                hourStart,
                clientErrorCount: acc.clientErrorCount,
                serverErrorCount: acc.serverErrorCount,
                avgRps: acc.sampleCount > 0 ? acc.rpsSum / acc.sampleCount : 0,
                maxRps: acc.rpsMax,
                avgLatency: acc.sampleCount > 0 ? acc.latencySum / acc.sampleCount : 0,
                maxLatency: acc.latencyMax,
                healthyEndpointCount: acc.sampleCount > 0 ? acc.healthyEndpointCount / acc.sampleCount : 0,
                slowEndpointCount: acc.sampleCount > 0 ? acc.slowEndpointCount / acc.sampleCount : 0,
                sampleCount: acc.sampleCount
            }));

        return {
            sessionNumber: session.sessionNumber,
            startedAt: session.startedAt,
            endedAt: session.endedAt,
            windowStart: window.start.toISOString(),
            windowEnd: window.end.toISOString(),
            clientErrorCount,
            serverErrorCount,
            avgRps: sampleCount > 0 ? rpsSum / sampleCount : 0,
            maxRps: rpsMax,
            avgLatency: sampleCount > 0 ? latencySum / sampleCount : 0,
            maxLatency: latencyMax,
            sampleCount,
            perHour
        };
    }

    //#endregion

    //#region Shutdown

    async shutdown(): Promise<void> {
        if (!this.enabled) return;
        if (this.shutdownPromise) return this.shutdownPromise;

        this.shutdownPromise = (async () => {
            Logger.debug('PersistenceLayer: Shutdown initiated.');
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

            try {
                await this.ready;
                await this.flushHttpBuffer();
                await this.writer.whenIdle();
                await this.registry.complete();
                await this.writer.close();

                const removed = await cleanupOrphanedTempFiles(this.baseDir);
                if (removed > 0) {
                    Logger.debug(`PersistenceLayer: Removed ${removed} orphaned temporary files during shutdown.`);
                }
                Logger.debug(`PersistenceLayer: Shutdown complete (lostRecords=${this.writer.lostRecords}).`);
            } catch (err) {
                Logger.error("Error during persistence shutdown:", err);
            }
        })();

        return this.shutdownPromise;
    }

    //#endregion

    //#region Archiving

    private async archiveOldCategory(category: PersistenceCategory): Promise<void> {
        const dir = path.join(this.baseDir, category);

        const today = new Date().toISOString().slice(0, 10);
        const files = await fs.readdir(dir).catch(() => [] as string[]);

        for (const file of files) {
            if (!file.endsWith('.ndjson')) continue;
            if (file.startsWith(today)) continue;

            const fullPath = path.join(dir, file);
            await writeChecksum(fullPath);
            await archiveFile(fullPath);
        }
    }

    archiveAllCategories(): void {
        const categories: PersistenceCategory[] = ['http_requests', 'system_health', 'events', 'correlation'];
        for (const category of categories) {
            this.archiveOldCategory(category).catch(err => {
                Logger.error(`Error archiving old ${category} files`, err);
            });
        }
    }

    //#endregion

    //#region Session Export

    private async streamWriteCategoryRecords(
        out: NodeJS.WritableStream,
        category: PersistenceCategory,
        dates: string[],
        window: { start: Date; end: Date }
    ): Promise<void> {
        let isFirst = true;
        const { start: windowStart, end: windowEnd } = window;

        for (const date of dates) {
            const filePath = await this.resolveExistingFile(category, date);
            if (!filePath) continue;

            for await (const record of readRecords(filePath)) {
                const ts = new Date(record.createdAt);
                if (ts < windowStart || ts > windowEnd) continue;

                if (!isFirst) out.write(',');
                isFirst = false;

                const canContinue = out.write(JSON.stringify(record));
                if (!canContinue) {
                    await new Promise<void>((resolve) => out.once('drain', resolve));
                }
            }
        }
    }

    private async streamWriteCategory(
        out: NodeJS.WritableStream,
        category: PersistenceCategory,
        dates: string[],
        window: { start: Date; end: Date },
        isLast: boolean = false
    ): Promise<void> {
        out.write(`"${category}":[`);
        await this.streamWriteCategoryRecords(out, category, dates, window);
        out.write(isLast ? ']' : '],');
    }

    async streamSessionExport(out: NodeJS.WritableStream, sessionNumber: number): Promise<boolean> {
        const session = await this.findSession(sessionNumber);
        if (!session) return false;

        const window = SessionRegistry.window(session);
        const dates = SessionRegistry.enumerateDates(window);

        out.write('{');
        out.write(`"sessionId":${JSON.stringify(session.sessionId)},`);
        out.write(`"sessionNumber":${JSON.stringify(session.sessionNumber)},`);
        out.write(`"status":${JSON.stringify(session.status)},`);
        out.write(`"startedAt":${JSON.stringify(session.startedAt)},`);
        out.write(`"endedAt":${JSON.stringify(session.endedAt)},`);

        await this.streamWriteCategory(out, 'http_requests', dates, window);
        await this.streamWriteCategory(out, 'system_health', dates, window);
        await this.streamWriteCategory(out, 'events', dates, window);
        await this.streamWriteCategory(out, 'correlation', dates, window, true);

        out.write('}');
        return true;
    }

    //#endregion
}