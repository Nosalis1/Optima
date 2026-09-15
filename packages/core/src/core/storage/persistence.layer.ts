import fs from "fs/promises";
import path from "path";
import { getConfig, ReadonlyConfig } from "../../config";
import {
    constructFilePath,
    appendRecordsAsync,
    writeChecksum,
    archiveFile,
    writeJSONAtomic,
    readJSON,
    readRecords
} from "../storage/utility/file-buffer";
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

export class PersistenceLayer {
    private httpBuffer: HttpMetricRecord[] = [];
    private readonly enabled: boolean;
    private readonly maxBufferSize: number;
    private readonly baseDir: string;
    private readonly persistRawRequests: boolean;
    private flushInFlight = false;

    private sessionMeta: SessionMetadata | null = null;
    private readonly manifestPath;

    constructor() {
        const config: ReadonlyConfig['persistence'] = getConfig().persistence;
        if (typeof config === 'boolean') {
            this.enabled = config;
            this.baseDir = './metrics_data';
            this.maxBufferSize = 200;
            this.persistRawRequests = false;
        } else {
            this.enabled = true;
            this.baseDir = config.baseDir;
            this.maxBufferSize = config.maxBufferSize ?? 200;
            this.persistRawRequests = config.persistRawRequests ?? false;
        }
        this.manifestPath = path.join(this.baseDir, 'session-manifest.json');

        this.initSession().then(meta => {
            Logger.debug(`Session initialized: #${meta.sessionNumber}, recoveredFromCrash=${meta.recoveredFromCrash}`);
        }).catch(err => {
            Logger.error('Failed to initialize session:', err);
        });
    }

    private async readManifest(): Promise<SessionManifest> {
        try {
            const manifest = await readJSON<SessionManifest>(this.manifestPath);
            return manifest;
        } catch {
            return { totalSessions: 0, lastStartedAt: '', lastShutdownAt: null, sessionHistory: [] };
        }
    }

    private async initSession(): Promise<SessionMetadata> {
        if (!this.enabled) {
            this.sessionMeta = {
                sessionNumber: 0,
                recoveredFromCrash: false,
                startedAt: new Date().toISOString(),
                endedAt: null
            };
            return this.sessionMeta;
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
            ApplicationEventManager.instance?.emit({
                type: 'CRASH',
                reason: 'Application recovered from an unexpected shutdown',
            });
        }

        return this.sessionMeta;
    }

    async getSessionManifest(): Promise<SessionManifest> {
        return await this.readManifest();
    }

    getSessionMetadata(): SessionMetadata | null {
        return this.sessionMeta;
    }

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

        const {
            systemStaticInfo,
            dashboardData,
            analyticsData,
            healthData
        } = snapshot;

        const {
            history: dashboardHistory,
            charts,
            ...safeDashboardData
        } = dashboardData;

        const {
            latencyDistribution,
            requestVolume,
            endpointsTable,
            history: analyticsHistory,
            ...safeAnalyticsData
        } = analyticsData;

        const data = {
            systemStaticInfo,
            dashboardData: safeDashboardData,
            analyticsData: safeAnalyticsData,
            healthData
        };

        const filePath = constructFilePath({
            baseDir: this.baseDir,
            category: 'system_health'
        });
        await appendRecordsAsync(filePath, "system_health", [data], {
            schemaVersion: 1
        });

        if (this.httpBuffer.length > 0 && !this.flushInFlight) {
            void this.flushHttpBuffer();
        }
    }

    async onApplicationEvent(event: ApplicationEvent): Promise<void> {
        if (!this.enabled) return;

        const filePath = constructFilePath({
            baseDir: this.baseDir,
            category: 'events'
        });
        await appendRecordsAsync(filePath, "events", [event], {
            schemaVersion: 1
        });

        if (this.httpBuffer.length > 0 && !this.flushInFlight) {
            void this.flushHttpBuffer();
        }
    }

    async shutdown(): Promise<void> {
        if (!this.enabled) return;
        const manifest = await this.readManifest();
        manifest.lastShutdownAt = new Date().toISOString();
        manifest.sessionHistory.push({
            sessionNumber: this.sessionMeta?.sessionNumber ?? 0,
            recoveredFromCrash: this.sessionMeta?.recoveredFromCrash ?? false,
            startedAt: this.sessionMeta?.startedAt ?? '',
            endedAt: manifest.lastShutdownAt
        });
        await writeJSONAtomic(this.manifestPath, manifest);

        await this.flushHttpBuffer();
    }

    async archiveOldFiles(category: 'http_requests' | 'system_health'): Promise<void> {
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
        this.archiveOldFiles('http_requests').catch(err => {
            Logger.error('Error archiving old HTTP request files', err);
        });
        this.archiveOldFiles('system_health').catch(err => {
            Logger.error('Error archiving old system health files', err);
        });
    }

    async findSession(sessionNumber: number): Promise<SessionMetadata | null> {
        if (this.sessionMeta?.sessionNumber === sessionNumber) {
            return this.sessionMeta;
        }
        const manifest = await this.readManifest();
        return manifest.sessionHistory.find(s => s.sessionNumber === sessionNumber) ?? null;
    }

    private async resolveExistingFile(category: 'http_requests' | 'system_health' | 'events', date: string): Promise<string | null> {
        const dir = path.join(this.baseDir, category);
        const plain = path.join(dir, `${date}.ndjson`);
        const gz = `${plain}.gz`;

        if (await fs.access(plain).then(() => true).catch(() => false)) return plain;
        if (await fs.access(gz).then(() => true).catch(() => false)) return gz;
        return null;
    }

    private enumerateDates(start: Date, end: Date): string[] {
        const dates: string[] = [];
        const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

        while (cursor <= last) {
            dates.push(cursor.toISOString().slice(0, 10));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        return dates;
    }

    private enumerateHours(start: Date, end: Date): string[] {
        const hours: string[] = [];
        const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours()));
        const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours()));

        while (cursor <= last) {
            hours.push(cursor.toISOString());
            cursor.setUTCHours(cursor.getUTCHours() + 1);
        }
        return hours;
    }

    private hourKeyFor(ts: Date): string {
        return new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate(), ts.getUTCHours())).toISOString();
    }

    async getSessionSummary(sessionNumber: number, windowHours = 24): Promise<SessionSummary | null> {
        const session = await this.findSession(sessionNumber);
        if (!session) return null;

        const sessionStart = new Date(session.startedAt);
        const windowEnd = session.endedAt ? new Date(session.endedAt) : new Date();
        const windowStartCandidate = new Date(windowEnd.getTime() - windowHours * 60 * 60 * 1000);
        const windowStart = windowStartCandidate > sessionStart ? windowStartCandidate : sessionStart;

        const dates = this.enumerateDates(windowStart, windowEnd);

        const hourly = new Map<string, HourBucketAccumulator>();
        for (const hourKey of this.enumerateHours(windowStart, windowEnd)) {
            hourly.set(hourKey, {
                clientErrorCount: 0,
                serverErrorCount: 0,
                rpsSum: 0,
                rpsMax: 0,
                latencySum: 0,
                latencyMax: 0,
                healthyEndpointCount: 0,
                slowEndpointCount: 0,
                sampleCount: 0
            });
        }

        let clientErrorCount = 0;
        let serverErrorCount = 0;
        let rpsSum = 0;
        let rpsMax = 0;
        let latencySum = 0;
        let latencyMax = 0;
        let healthyEndpointCount = 0;
        let slowEndpointCount = 0;
        let sampleCount = 0;

        for (const date of dates) {
            const httpPath = await this.resolveExistingFile('http_requests', date);
            if (httpPath) {
                for await (const record of readRecords<HttpMetricRecord>(httpPath)) {
                    const ts = new Date(record.payload.timestamp);
                    if (ts < windowStart || ts > windowEnd) continue;

                    const bucket = hourly.get(this.hourKeyFor(ts));
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
                for await (const record of readRecords<HealthSnapshotRecord>(healthPath)) {
                    const ts = new Date(record.createdAt);
                    if (ts < windowStart || ts > windowEnd) continue;

                    const rps = record.payload.dashboardData.current.rps;
                    const latency = record.payload.dashboardData.current.latency;

                    rpsSum += rps;
                    rpsMax = Math.max(rpsMax, rps);

                    latencySum += latency;
                    latencyMax = Math.max(latencyMax, latency);

                    healthyEndpointCount += record.payload.analyticsData.summary.healthyEndpoints;
                    slowEndpointCount += record.payload.analyticsData.summary.slowEndpoints;

                    sampleCount++;

                    const bucket = hourly.get(this.hourKeyFor(ts));
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
            windowStart: windowStart.toISOString(),
            windowEnd: windowEnd.toISOString(),
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

    private async streamCategoryRecords(category: 'http_requests' | 'system_health' | 'events', dates: string[], windowStart: Date, windowEnd: Date, out: NodeJS.WritableStream): Promise<void> {
        let isFirst = true;

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
                    await new Promise(resolve => out.once('drain', resolve));
                }
            }
        }
    }

    async streamSessionExport(sessionNumber: number, out: NodeJS.WritableStream): Promise<boolean> {
        const session = await this.findSession(sessionNumber);
        if (!session) return false;

        const windowStart = new Date(session.startedAt);
        const windowEnd = session.endedAt ? new Date(session.endedAt) : new Date();
        const dates = this.enumerateDates(windowStart, windowEnd);

        out.write('{');
        out.write(`"sessionNumber":${JSON.stringify(session.sessionNumber)},`);
        out.write(`"startedAt":${JSON.stringify(session.startedAt)},`);
        out.write(`"endedAt":${JSON.stringify(session.endedAt)},`);

        out.write('"httpRequests":[');
        await this.streamCategoryRecords('http_requests', dates, windowStart, windowEnd, out);
        out.write('],');

        out.write('"systemHealth":[');
        await this.streamCategoryRecords('system_health', dates, windowStart, windowEnd, out);
        out.write('],');

        out.write('"events":[');
        await this.streamCategoryRecords('events', dates, windowStart, windowEnd, out);
        out.write(']');

        out.write('}');
        return true;
    }
}

export const persistence = new PersistenceLayer();