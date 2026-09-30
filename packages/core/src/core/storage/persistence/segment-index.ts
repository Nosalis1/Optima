import * as fsp from "fs/promises";
import path from "path";
import {
    readRecords,
    writeJSONAtomic
} from '../utility/file-buffer';
import { dedupeRecords, type PersistenceCategory } from './persistence-writer';
import Logger from '../../telemetry/logger';
import type { MetricBucket } from '../stores/bucket-metric';

export interface SegmentEntry {
    date: string;
    sessionId: string;
    minSequence: number;
    maxSequence: number;
    minStartMs: number;
    maxEndMs: number;
    count: number;
}

interface IndexFile {
    version: 1;
    date: string;
    fileName: string;
    fileSize: number;
    entries: SegmentEntry[];
}

const CATEGORY = 'metric_buckets' as const;
const FILE_RE = /^(\d{4}-\d{2}-\d{2})\.ndjson(\.gz)?$/;
const todayUtc = () => new Date().toISOString().slice(0, 10);

function touch(entries: Map<string, SegmentEntry>, date: string, b: MetricBucket): void {
    const startMs = Date.parse(b.startTime);
    const endMs = Date.parse(b.endTime);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) { return; }

    const e = entries.get(b.sessionId);
    if (!e) {
        entries.set(b.sessionId, {
            date, sessionId: b.sessionId,
            minSequence: b.sequence, maxSequence: b.sequence,
            minStartMs: startMs, maxEndMs: endMs,
            count: 1
        });
        return;
    }
    e.minSequence = Math.min(e.minSequence, b.sequence);
    e.maxSequence = Math.max(e.maxSequence, b.sequence);
    e.minStartMs = Math.min(e.minStartMs, startMs);
    e.maxEndMs = Math.max(e.maxEndMs, endMs);
    e.count++;
}

export class SegmentIndex {
    private readonly dir: string;
    private readonly byDate = new Map<string, Map<string, SegmentEntry>>();
    private readonly dirty = new Set<string>();

    constructor(
        private readonly baseDir: string
    ) {
        this.dir = path.join(baseDir, CATEGORY);
    }

    async rebuild(): Promise<void> {
        this.byDate.clear();
        this.dirty.clear();

        const files = await fsp.readdir(this.dir).catch(() => [] as string[]);
        const dates = new Set<string>();
        for (const f of files) {
            const m = FILE_RE.exec(f);
            if (m) dates.add(m[1]);
        }

        const today = todayUtc();
        for (const date of [...dates].sort()) {
            try {
                await this.loadOrScan(date, date < today);
            } catch (err) {
                Logger.error(`SegmentIndex: failed to index ${date}: ${err}`);
            }
        }
    }

    noteWritten(bucket: MetricBucket): void {
        const date = bucket.endTime.slice(0, 10);
        let entries = this.byDate.get(date);
        if (!entries) {
            entries = new Map();
            this.byDate.set(date, entries);
        }
        touch(entries, date, bucket);
        this.dirty.add(date);
    }

    find(sessionId: string, fromMs: number, toMs: number): string[] {
        const dates: string[] = [];
        for (const [date, entries] of this.byDate) {
            const e = entries.get(sessionId);
            if (e && e.minStartMs <= toMs && e.maxEndMs >= fromMs) {
                dates.push(date);
            }
        }
        return dates.sort();
    }

    async persistClosed(): Promise<void> {
        const today = todayUtc();
        for (const date of [...this.dirty]) {
            if (date >= today) continue;
            try {
                await this.persist(date);
                this.dirty.delete(date);
            } catch (err) {
                Logger.error(`SegmentIndex: failed to persist index for ${date}: ${err}`);
            }
        }
    }

    private indexPath(date: string): string {
        return path.join(this.dir, `${date}.index.json`);
    }

    private async resolveExistingFile(category: PersistenceCategory, date: string): Promise<string | null> {
        const dir = path.join(this.baseDir, category);
        const plain = path.join(dir, `${date}.ndjson`);
        const gz = `${plain}.gz`;

        if (await fsp.access(plain).then(() => true).catch(() => false)) return plain;
        if (await fsp.access(gz).then(() => true).catch(() => false)) return gz;
        return null;
    }

    private async loadOrScan(date: string, closed: boolean): Promise<void> {
        const file = await this.resolveExistingFile(CATEGORY as PersistenceCategory, date);
        if (!file) return;
        const size = (await fsp.stat(file)).size;

        if (closed) {
            const cached = await this.tryLoad(date, path.basename(file), size);
            if (cached) {
                this.byDate.set(date, cached);
                return;
            }
        }

        const entries = await this.scan(file, date);
        this.byDate.set(date, entries);
        if (closed) {
            await this.persist(date).catch(err => Logger.error(`SegmentIndex: persist failed for ${date}: ${err}`));
        } else {
            this.dirty.add(date);
        }
    }

    private async tryLoad(date: string, fileName: string, fileSize: number): Promise<Map<string, SegmentEntry> | null> {
        try {
            const raw = JSON.parse(await fsp.readFile(this.indexPath(date), 'utf-8')) as IndexFile;
            if (raw.version !== 1 || raw.date !== date || raw.fileName !== fileName || raw.fileSize !== fileSize) {
                return null;
            }
            return new Map(raw.entries.map(e => [e.sessionId, e]));
        } catch {
            return null;
        }
    }

    private async scan(file: string, date: string): Promise<Map<string, SegmentEntry>> {
        const entries = new Map<string, SegmentEntry>();
        for await (const rec of dedupeRecords(readRecords<MetricBucket>(file))) {
            const b = rec.payload;
            if (!b || b.schemaVersion !== 2 || typeof b.sessionId !== 'string') continue;
            touch(entries, date, b);
        }
        return entries;
    }

    private async persist(date: string): Promise<void> {
        const entries = this.byDate.get(date);
        const file = await this.resolveExistingFile(CATEGORY as PersistenceCategory, date);
        if (!entries || !file) return;
        const size = (await fsp.stat(file)).size;
        const data: IndexFile = {
            version: 1,
            date,
            fileName: path.basename(file),
            fileSize: size,
            entries: [...entries.values()]
        };
        await writeJSONAtomic(this.indexPath(date), data);
    }
}