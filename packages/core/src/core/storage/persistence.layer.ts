import path from "path";
import { getConfig, ReadonlyConfig } from "../../config";
import {
    constructFilePath,
    appendRecordsAsync,
    writeJSONAtomic,
    readJSON,
    readRecords,
    cleanupOrphanedTempFiles,
    tryOrDefault,
    getSessionWindow,
    getSessionDatesFromWindow,
    getSessionHoursFromWindow,
    hourKeyFor,
    resolveExistingFile,
    archiveOldPersistenceFiles,
    streamWriteCategory
} from "./utility";
import type {
    AnalyticsData,
    ApplicationEvent,
    DashboardData,
    HealthData,
    SystemStaticInfo,
    SessionManifest,
    SessionMetadata,
    SessionSummary,
    HourlyBucket
} from "../domain";
import { ApplicationEventManager } from "../organizers";
import Logger from "../telemetry/logger";

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

export class PersistenceRepository {
    private httpBuffer: HttpMetricRecord[] = [];
    private readonly enabled: boolean;
    private readonly maxBufferSize: number;
    private readonly baseDir: string;
    private readonly persistRawRequests: boolean;
    private flushInFlight = false;

    private sessionMeta: SessionMetadata | null = null;
    private readonly manifestPath: string;

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
        this.manifestPath = path.join(this.baseDir, 'session-manifest.json');

        this.initSession().then(meta => {
            Logger.debug(`Session initialized: #${meta.sessionNumber}, recoveredFromCrash=${meta.recoveredFromCrash}`);
        }).catch(err => {
            Logger.error('Failed to initialize session:', err);
        });
    }

    //#region Initialization

    private async readManifest(): Promise<SessionManifest> {
        return await tryOrDefault<SessionManifest>(
            () => readJSON<SessionManifest>(this.manifestPath),
            { totalSessions: 0, lastStartedAt: '', lastShutdownAt: null, sessionHistory: [] }
        );
    }

    private async initSession(): Promise<SessionMetadata> {
        try {
            if (!this.enabled) {
                return {
                    sessionNumber: 0,
                    recoveredFromCrash: false,
                    startedAt: new Date().toISOString(),
                    endedAt: null
                };
            }

            const removed = await cleanupOrphanedTempFiles(this.baseDir);
            if (removed > 0) {
                Logger.debug(`PersistenceLayer: Removed ${removed} orphaned temporary files during initialization.`);
            }

            const manifest = await this.readManifest();
            const recoveredFromCrash = manifest.lastStartedAt !== '' && manifest.lastShutdownAt === null;

            const now = new Date().toISOString();
            manifest.totalSessions += 1;
            manifest.lastStartedAt = now;
            manifest.lastShutdownAt = null; // currently running

            await writeJSONAtomic(this.manifestPath, manifest);

            this.sessionMeta = {
                sessionNumber: manifest.totalSessions,
                recoveredFromCrash,
                startedAt: now,
                endedAt: null
            };

            if (recoveredFromCrash) {
                void ApplicationEventManager.instance?.emit({
                    type: 'CRASH',
                    reason: 'Application recovered from an unexpected shutdown',
                });
            }

            return this.sessionMeta;
        } catch (err) {
            Logger.error("Error during session initialization:", err);
            throw err;
        }
    }

    //#endregion

    //#region Writing Metrics

    onHttpRequest(metric: HttpMetricRecord): void {
        if (!this.enabled || !this.persistRawRequests) return;
        if (metric.statusCode < 400) return; // Only persisting errors for now

        this.httpBuffer.push(metric);

        if (this.httpBuffer.length >= this.maxBufferSize && !this.flushInFlight) {
            void this.flushHttpBuffer();
        }
    }

    private async flushHttpBuffer(): Promise<void> {
        if (this.httpBuffer.length === 0) return;
        this.flushInFlight = true;

        const toWrite = this.httpBuffer;
        this.httpBuffer = [];

        try {
            const filePath = constructFilePath({
                baseDir: this.baseDir,
                category: 'http_requests'
            });

            await appendRecordsAsync(filePath, "http_requests", toWrite, {
                schemaVersion: 1
            });
        } catch (err) {
            Logger.error("Failed to write HTTP metrics to disk:", err);
        } finally {
            this.flushInFlight = false;
        }
    }

    async onPublisherTick(snapshot: HealthSnapshotRecord | null): Promise<void> {
        if (!this.enabled || snapshot === null) return;

        const { systemStaticInfo, dashboardData, analyticsData, healthData } = snapshot;
        const { history: dashboardHistory, charts, ...safeDashboardData } = dashboardData;
        const { latencyDistribution, requestVolume, endpointsTable, history: analyticsHistory, ...safeAnalyticsData } = analyticsData;
        const data = { systemStaticInfo, dashboardData: safeDashboardData, analyticsData: safeAnalyticsData, healthData };

        const filePath = constructFilePath({ baseDir: this.baseDir, category: 'system_health' });
        await appendRecordsAsync(filePath, "system_health", [data], { schemaVersion: 1 });

        if (this.httpBuffer.length > 0 && !this.flushInFlight) {
            void this.flushHttpBuffer();
        }
    }

    async onApplicationEvent(event: ApplicationEvent): Promise<void> {
        if (!this.enabled) return;

        const filePath = constructFilePath({ baseDir: this.baseDir, category: 'events' });
        await appendRecordsAsync(filePath, "events", [event], { schemaVersion: 1 });

        if (this.httpBuffer.length > 0 && !this.flushInFlight) {
            void this.flushHttpBuffer();
        }
    }

    //#endregion

    //#region Reading Metrics

    async getSessionManifest(): Promise<SessionManifest> {
        if (!this.enabled) {
            return { totalSessions: 0, lastStartedAt: '', lastShutdownAt: null, sessionHistory: [] };
        }
        return await this.readManifest();
    }

    getSessionMetadata(): SessionMetadata | null {
        if (!this.enabled) {
            return {
                sessionNumber: 0,
                recoveredFromCrash: false,
                startedAt: new Date().toISOString(),
                endedAt: null
            };
        }
        return this.sessionMeta;
    }

    async findSession(sessionNumber: number): Promise<SessionMetadata | null> {
        if (this.sessionMeta?.sessionNumber === sessionNumber) {
            return this.sessionMeta;
        }
        const manifest = await this.readManifest();
        return manifest.sessionHistory.find(s => s.sessionNumber === sessionNumber) ?? null;
    }

    async getSessionSummary(sessionNumber: number, windowHours = 24): Promise<SessionSummary | null> {
        const session = await this.findSession(sessionNumber);
        if (!session) return null;


        const window = getSessionWindow(session.startedAt, session.endedAt);
        const windowStartCandidate = new Date(window.end.getTime() - windowHours * 60 * 60 * 1000);
        window.start = windowStartCandidate > window.start ? windowStartCandidate : window.start;

        const dates = getSessionDatesFromWindow(window);

        const hourly = new Map<string, HourBucketAccumulator>();
        for (const hourKey of getSessionHoursFromWindow(window)) {
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
        let healthyEndpointCount = 0, slowEndpointCount = 0;
        let sampleCount = 0;

        for (const date of dates) {
            const httpPath = await resolveExistingFile(this.baseDir, 'http_requests', date);
            if (httpPath) {
                for await (const record of readRecords<HttpMetricRecord>(httpPath)) {
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

            const healthPath = await resolveExistingFile(this.baseDir, 'system_health', date);
            if (healthPath) {
                for await (const record of readRecords<HealthSnapshotRecord>(healthPath)) {
                    const ts = new Date(record.createdAt);
                    if (ts < window.start || ts > window.end) continue;

                    const rps = record.payload.dashboardData.current.rps;
                    const latency = record.payload.dashboardData.current.latency;

                    rpsSum += rps;
                    rpsMax = Math.max(rpsMax, rps);

                    latencySum += latency;
                    latencyMax = Math.max(latencyMax, latency);

                    healthyEndpointCount += record.payload.analyticsData.summary.healthyEndpoints;
                    slowEndpointCount += record.payload.analyticsData.summary.slowEndpoints;

                    sampleCount++;

                    const bucket = hourly.get(hourKeyFor(ts));
                    if (bucket) {
                        bucket.rpsSum += rps;
                        bucket.rpsMax = Math.max(bucket.rpsMax, rps);
                        bucket.latencySum += latency;
                        bucket.latencyMax = Math.max(bucket.latencyMax, latency);
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

        Logger.debug('PersistenceLayer: Shutdown initiated. Flushing buffers and updating session manifest.');

        try {
            const manifest = await this.readManifest();
            if (!Array.isArray(manifest.sessionHistory)) {
                manifest.sessionHistory = [];
            }
            manifest.lastShutdownAt = new Date().toISOString();
            manifest.sessionHistory.push({
                sessionNumber: this.sessionMeta?.sessionNumber ?? 0,
                recoveredFromCrash: this.sessionMeta?.recoveredFromCrash ?? false,
                startedAt: this.sessionMeta?.startedAt ?? '',
                endedAt: manifest.lastShutdownAt
            });
            await writeJSONAtomic(this.manifestPath, manifest);
            await this.flushHttpBuffer();
            Logger.debug('PersistenceLayer: Session manifest updated and HTTP buffer flushed.');

            const removed = await cleanupOrphanedTempFiles(this.baseDir);
            if (removed > 0) {
                Logger.debug(`PersistenceLayer: Removed ${removed} orphaned temporary files during initialization.`);
            }

        } catch (err) {
            Logger.error("Error during persistence shutdown:", err);
        }
    }

    //#endregion

    //#region Archiving

    archiveAllCategories(): void {
        archiveOldPersistenceFiles(this.baseDir, 'http_requests').catch(err => {
            Logger.error('Error archiving old HTTP request files', err);
        });
        archiveOldPersistenceFiles(this.baseDir, 'system_health').catch(err => {
            Logger.error('Error archiving old system health files', err);
        });
        archiveOldPersistenceFiles(this.baseDir, 'events').catch(err => {
            Logger.error('Error archiving old event files', err);
        });
    }

    //#endregion

    //#region Session Export

    async streamSessionExport(out: NodeJS.WritableStream, sessionNumber: number): Promise<boolean> {
        const session = await this.findSession(sessionNumber);
        if (!session) return false;

        const window = getSessionWindow(session.startedAt, session.endedAt);
        const dates = getSessionDatesFromWindow(window);

        out.write('{');
        out.write(`"sessionNumber":${JSON.stringify(session.sessionNumber)},`);
        out.write(`"startedAt":${JSON.stringify(session.startedAt)},`);
        out.write(`"endedAt":${JSON.stringify(session.endedAt)},`);

        await streamWriteCategory(out, this.baseDir, 'http_requests', dates, window);
        await streamWriteCategory(out, this.baseDir, 'system_health', dates, window);
        await streamWriteCategory(out, this.baseDir, 'events', dates, window, true);

        out.write('}');
        return true;
    }

    //#endregion
}