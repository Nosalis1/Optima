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
    ApplicationEvent,
    Incident,
    SessionSummary,
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
import { BUCKET_SCHEMA_VERSION, type MetricBucket } from "./stores/bucket-metric";
import { SegmentIndex } from "./persistence/segment-index";
import { buildSessionSummary } from "./persistence/session-summary";
import type { CommittedBucketSource, MetricsQuery, QueryIssue, TelemetryQueryService } from "../telemetry/telemetry-query.service";
import type { CorrelationFinding } from "../telemetry/utility/correlation-finding";

type HttpMetricRecord = {
    method: string;
    path: string;
    statusCode: number;
    durationMs: number;
    timestamp: string;
};

const HEARTBEAT_INTERVAL_MS = 30_000;

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
    private closing = false;
    private readonly inFlight = new Set<Promise<unknown>>();

    readonly sessionId = randomUUID();

    private readonly segments: SegmentIndex;
    private queries: TelemetryQueryService | null = null;

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

        this.segments = new SegmentIndex(this.baseDir);
        this.ready = this.initSession().catch(err => {
            Logger.error('Failed to initialize session:', err);
            return null;
        });
    }

    attachQueryService(q: TelemetryQueryService): void { this.queries = q; }
    get isEnabled(): boolean { return this.enabled; }
    get bucketSource(): CommittedBucketSource {
        return { read: (s, f, t, onIssue) => this.readBuckets(s, f, t, onIssue) };
    }

    //#region Initialization

    private async initSession(): Promise<SessionRecord | null> {
        if (!this.enabled) return null;

        const removed = await cleanupOrphanedTempFiles(this.baseDir);
        if (removed > 0) {
            Logger.debug(`PersistenceLayer: Removed ${removed} orphaned temporary files during initialization.`);
        }

        await this.segments.rebuild();

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

    private track<T>(op: Promise<T>): Promise<T> {
        this.inFlight.add(op);
        void op.finally(() => this.inFlight.delete(op)).catch(() => { });
        return op;
    }

    private async drainInFlight(): Promise<void> {
        while (this.inFlight.size > 0) {
            await Promise.allSettled([...this.inFlight]);
        }
    }

    private async enqueue<T>(category: PersistenceCategory, items: RecordInput<T>[]): Promise<void> {
        try {
            await this.writer.enqueueAppend(this.baseDir, category, items);
            this.registry.notePersisted();
        } catch {
            // do nothing
        }
    }

    onHttpRequest(metric: HttpMetricRecord): void {
        if (!this.enabled || !this.persistRawRequests || this.closing) return;
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
        await this.track(this.enqueue('http_requests', batch));
    }

    onBucketClosed(bucket: MetricBucket): Promise<boolean> {
        if (!this.enabled) return Promise.resolve(false);
        return this.track((async () => {
            const session = await this.ready;
            if (!session) return false;
            try {
                await this.writer.enqueueAppend(this.baseDir, 'metric_buckets', [{ recordId: bucket.bucketId, payload: bucket }], { date: new Date(bucket.endTime) });
                this.segments.noteWritten(bucket);
                this.registry.notePersisted(bucket.sequence);
                return true;
            } catch {
                return false;
            }
        })());
    }

    saveCorrelationFinding(finding: CorrelationFinding): Promise<boolean> {
        if (!this.enabled) return Promise.resolve(false);
        return this.track((async () => {
            const session = await this.ready;
            if (!session) return false;
            try {
                await this.writer.enqueueAppend(this.baseDir, 'correlation',
                    [{ recordId: finding.findingId, payload: finding }]);
                this.registry.notePersisted();
                return true;
            } catch { return false; }
        })());
    }

    onApplicationEvent(event: ApplicationEvent): Promise<void> {
        if (!this.enabled) return Promise.resolve();
        const record = { recordId: randomUUID(), payload: { ...event } };
        return this.track((async () => {
            const session = await this.ready;
            if (!session) return;
            await this.enqueue('events', [record]);
        })());
    }

    getStorageStatus(): { status: StorageStatus; lostRecords: number; pending: number; lastError: PersistenceWriter['lastError'] } {
        return {
            status: this.writer.status,
            lostRecords: this.writer.lostRecords,
            pending: this.writer.pending + this.inFlight.size,
            lastError: this.writer.lastError
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
                lastCommittedSequence: 0,
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

    private requireQueries(): TelemetryQueryService {
        if (!this.queries) throw new Error('PersistenceRepository: query service not attached');
        return this.queries;
    }

    sessionQuery(session: SessionRecord): MetricsQuery {
        const window = SessionRegistry.window(session);
        return {
            sessionId: session.sessionId,
            from: window.start.toISOString(),
            to: window.end.toISOString(),
            consistency: session.status === 'RUNNING' ? 'live' : 'committed',
        };
    }

    async getSessionSummary(sessionNumber: number, windowHours = 24): Promise<SessionSummary | null> {
        const session = await this.findSession(sessionNumber);
        if (!session) return null;
        const incidents = await this.sessionIncidents(session);
        return buildSessionSummary(this.requireQueries(), session, windowHours, this.config.publisher.slowLatencyThresholdMs, incidents);
    }

    private async sessionIncidents(session: SessionRecord): Promise<Incident[]> {
        if (!this.enabled) return [];
        const byId = new Map<string, Incident>();
        const events = this.sessionRecords<ApplicationEvent>('events', session, e =>
            (e.type === 'INCIDENT_OPENED' || e.type === 'INCIDENT_RESOLVED')
            && (e.details as Partial<Incident> | undefined)?.sessionId === session.sessionId);
        for await (const event of events) {
            const incident = event.details as unknown as Incident;
            const prev = byId.get(incident.incidentId);
            if (!prev || prev.status !== 'RESOLVED') byId.set(incident.incidentId, incident);
        }
        return [...byId.values()].sort((a, b) => b.firedAt.localeCompare(a.firedAt));
    }

    async findCorrelationFinding(findingId: string): Promise<CorrelationFinding | null> {
        if (!this.enabled) return null;
        await this.ready;
        const sessionId = findingId.split(':')[0];
        const session = this.registry.all.find(s => s.sessionId === sessionId);
        if (!session) return null;

        for (const date of SessionRegistry.enumerateDates(SessionRegistry.window(session))) {
            const file = await this.resolveExistingFile('correlation', date);
            if (!file) continue;
            for await (const rec of dedupeRecords(readRecords<CorrelationFinding>(file))) {
                if (rec.id === findingId) return rec.payload;
            }
        }
        return null;
    }

    async *readBuckets(sessionId: string, fromMs: number, toMs: number, onIssue: (i: QueryIssue) => void): AsyncGenerator<MetricBucket> {
        for (const date of this.segments.find(sessionId, fromMs, toMs)) {
            const file = await this.resolveExistingFile('metric_buckets', date);
            if (!file) { onIssue({ type: 'SOURCE_ERROR', detail: `Missing segment ${date}` }); continue; }
            const records = dedupeRecords(readRecords<MetricBucket>(file), id => onIssue({ type: 'CONFLICT', bucketId: id }));
            for await (const rec of records) {
                const b = rec.payload;
                if (b?.schemaVersion !== BUCKET_SCHEMA_VERSION || b.sessionId !== sessionId) continue;
                if (Date.parse(b.startTime) > toMs || Date.parse(b.endTime) < fromMs) continue;
                yield b;
            }
        }
    }

    //#endregion

    //#region Shutdown

    async shutdown(): Promise<void> {
        if (!this.enabled) return;
        if (this.shutdownPromise) return this.shutdownPromise;

        this.shutdownPromise = (async () => {
            Logger.debug('PersistenceLayer: Shutdown initiated.');
            this.closing = true;
            if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

            try {
                await this.ready;
                await this.flushHttpBuffer();
                await this.drainInFlight();
                await this.writer.whenIdle();
                await this.segments.persistClosed();
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
        const categories: PersistenceCategory[] = ['http_requests', 'events', 'correlation', 'metric_buckets'];
        for (const category of categories) {
            this.archiveOldCategory(category).catch(err => {
                Logger.error(`Error archiving old ${category} files`, err);
            });
        }
        void this.segments.persistClosed();
    }

    //#endregion

    //#region Session Export

    private async writeChunk(out: NodeJS.WritableStream, chunk: string): Promise<void> {
        if (!out.write(chunk)) await new Promise<void>(resolve => out.once('drain', resolve));
    }

    private async streamJsonArray<T>(out: NodeJS.WritableStream, name: string, items: AsyncIterable<T>, last = false): Promise<void> {
        await this.writeChunk(out, `${JSON.stringify(name)}:[`);
        let first = true;
        for await (const item of items) {
            await this.writeChunk(out, (first ? '' : ',') + JSON.stringify(item));
            first = false;
        }
        await this.writeChunk(out, last ? ']' : '],');
    }

    private async *sessionRecords<T>(
        category: PersistenceCategory,
        session: SessionRecord,
        belongs: (payload: T) => boolean
    ): AsyncGenerator<T> {
        const window = SessionRegistry.window(session);
        for (const date of SessionRegistry.enumerateDates(window)) {
            const file = await this.resolveExistingFile(category, date);
            if (!file) continue;
            for await (const rec of dedupeRecords(readRecords<T>(file))) {
                if (belongs(rec.payload)) yield rec.payload;
            }
        }
    }

    async streamSessionExport(out: NodeJS.WritableStream, sessionNumber: number): Promise<boolean> {
        const session = await this.findSession(sessionNumber);
        if (!session) return false;

        const queries = this.requireQueries();
        const window = SessionRegistry.window(session);
        const inWindow = (iso: string | undefined) => {
            const t = iso ? Date.parse(iso) : NaN;
            return t >= window.start.getTime() && t <= window.end.getTime();
        };

        const incidents = await this.sessionIncidents(session);
        const summary = await buildSessionSummary(queries, session, Number.POSITIVE_INFINITY, this.config.publisher.slowLatencyThresholdMs, incidents);
        const issues: QueryIssue[] = [];
        const query = this.sessionQuery(session);
        const buckets = (async function* () {
            for await (const e of queries.buckets(query, i => issues.push(i))) yield e.bucket;
        })();

        await this.writeChunk(out, '{');
        await this.writeChunk(out, `"sessionId":${JSON.stringify(session.sessionId)},`);
        await this.writeChunk(out, `"sessionNumber":${JSON.stringify(session.sessionNumber)},`);
        await this.writeChunk(out, `"status":${JSON.stringify(session.status)},`);
        await this.writeChunk(out, `"startedAt":${JSON.stringify(session.startedAt)},`);
        await this.writeChunk(out, `"endedAt":${JSON.stringify(session.endedAt)},`);
        await this.writeChunk(out, `"lastCommittedSequence":${JSON.stringify(session.lastCommittedSequence)},`);
        await this.writeChunk(out, `"summary":${JSON.stringify(summary)},`);

        await this.streamJsonArray(out, 'metric_buckets', buckets);
        await this.writeChunk(out, `"bucketIssues":${JSON.stringify(issues)},`);
        await this.streamJsonArray(out, 'events', this.sessionRecords<ApplicationEvent>('events', session, e => inWindow(e.timestamp)));
        await this.streamJsonArray(out, 'http_requests', this.sessionRecords<HttpMetricRecord>('http_requests', session, r => inWindow(r.timestamp)));
        await this.streamJsonArray(out, 'correlation', this.sessionRecords<CorrelationFinding>('correlation', session, f => f.sessionId === session.sessionId), true);

        await this.writeChunk(out, '}');
        return true;
    }

    //#endregion
}
