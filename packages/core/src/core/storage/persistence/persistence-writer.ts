import * as fsp from 'fs/promises';
import Logger from '../../telemetry/logger';
import { constructFilePath, type StoredRecord } from '../utility/index';

export type PersistenceCategory = 'http_requests' | 'events' | 'correlation' | 'metric_buckets';

export type StorageStatus = 'OK' | 'DEGRADED';

export interface WriterOptions {
    maxQueue?: number; // max number of jobs in queue
    maxRetries?: number; // max number of retries for a failed job
    retryDelayMs?: number; // delay between retries in milliseconds
    onStatusChange?: (status: StorageStatus) => void;
}
export interface RecordInput<T> {
    recordId: string;
    payload: T;
}

interface Job {
    description: string;
    recordCount: number;
    run: (attempt: number) => Promise<void>;
    resolve: (sequence: number) => void;
    reject: (error: Error) => void;
}

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export class PersistenceWriter {
    private readonly queue: Job[] = [];
    private runner: Promise<void> | null = null;
    private accepting = true;

    private readonly maxQueue: number;
    private readonly maxRetries: number;
    private readonly retryDelayMs: number;
    private readonly onStatusChange?: (s: StorageStatus) => void;

    private _status: StorageStatus = 'OK';
    private _lostRecords = 0;
    private _completedJobs = 0;
    private _lastError: { description: string; message: string; at: string } | null = null;

    constructor(options: WriterOptions = {}) {
        this.maxQueue = options.maxQueue ?? 1000;
        this.maxRetries = options.maxRetries ?? 3;
        this.retryDelayMs = options.retryDelayMs ?? 100;
        this.onStatusChange = options.onStatusChange;
    }

    get status(): StorageStatus { return this._status; }
    get lostRecords(): number { return this._lostRecords; }
    get completedJobs(): number { return this._completedJobs; }
    get lastError() { return this._lastError; }
    get isAccepting(): boolean { return this.accepting; }
    get pending(): number { return this.queue.length; }

    enqueueAppend<T>(baseDir: string, category: PersistenceCategory, items: RecordInput<T>[], opts: { date?: Date } = {}): Promise<number> {
        if (items.length === 0) return Promise.resolve(this._completedJobs);

        const createdAt = new Date().toISOString();
        const records: StoredRecord<T>[] = items.map(i => ({
            id: i.recordId,
            createdAt,
            schemaVersion: 1,
            category,
            payload: i.payload
        }));

        let chunk: string;
        try {
            chunk = records.map(r => JSON.stringify(r)).join('\n') + '\n';
        } catch (err) {
            this.markLost(items.length);
            return Promise.reject(new Error(`Serialization failed for ${category}: ${err}`));
        }

        const filePath = constructFilePath({ baseDir, category, date: opts.date });

        return this.push({
            description: `Append ${records.length} records to ${filePath}`,
            recordCount: items.length,
            run: async (attempt) => {
                await fsp.appendFile(filePath, attempt > 0 ? '\n' + chunk : chunk, 'utf-8');
            },
        });
    }

    enqueueTask(description: string, task: () => Promise<void>): Promise<number> {
        return this.push({ description, recordCount: 0, run: () => task() });
    }

    async whenIdle(): Promise<void> {
        while (this.runner) await this.runner;
    }

    async close(): Promise<void> {
        this.accepting = false;
        await this.whenIdle();
    }

    private push(partial: Omit<Job, 'resolve' | 'reject'>): Promise<number> {
        if (!this.accepting) {
            this.markLost(partial.recordCount);
            return Promise.reject(new Error(`Writer closed; rejected: ${partial.description}`));
        }
        if (this.queue.length >= this.maxQueue) {
            this.markLost(partial.recordCount);
            Logger.error(`PersistenceWriter: queue full (${this.maxQueue}); rejected: ${partial.description}`);
            return Promise.reject(new Error('Persistence queue full'));
        }
        return new Promise<number>((resolve, reject) => {
            this.queue.push({ ...partial, resolve, reject });
            this.kick();
        });
    }

    private kick(): void {
        if (this.runner) return;
        this.runner = this.drain()
            .catch(err => Logger.error('PersistenceWriter: unexpected drain error', err))
            .finally(() => {
                this.runner = null;
                if (this.queue.length > 0) this.kick();
            });
    }

    private async drain(): Promise<void> {
        while (this.queue.length > 0) {
            const job = this.queue[0];
            let lastErr: unknown = null;
            let ok = false;

            for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                try {
                    await job.run(attempt);
                    ok = true;
                    break;
                } catch (err) {
                    lastErr = err;
                    if (attempt < this.maxRetries) await sleep(this.retryDelayMs * 2 ** attempt);
                }
            }

            this.queue.shift();
            if (ok) {
                this._completedJobs++;
                job.resolve(this._completedJobs);
            } else {
                this._lastError = {
                    description: job.description,
                    message: lastErr instanceof Error ? lastErr.message : String(lastErr),
                    at: new Date().toISOString()
                };
                this.markLost(job.recordCount);
                Logger.error(`PersistenceWriter: giving up on "${job.description}":`, lastErr);
                job.reject(lastErr instanceof Error ? lastErr : new Error(String(lastErr)));
            }
        }
    }

    private markLost(count: number): void {
        this._lostRecords += count;
        if (this._status !== 'DEGRADED') {
            this._status = 'DEGRADED';
            this.onStatusChange?.(this._status);
        }
    }
}

export async function* dedupeRecords<T>(source: AsyncIterable<StoredRecord<T>>, onConflict?: (id: string) => void): AsyncGenerator<StoredRecord<T>> {
    const seen = new Map<string, string>();
    for await (const record of source) {
        const fingerprint = JSON.stringify(record.payload);
        const prev = seen.get(record.id);
        if (prev === undefined) {
            seen.set(record.id, fingerprint);
            yield record;
        } else if (prev !== fingerprint) {
            Logger.error(`Record ID conflict: ${record.id}`);
            onConflict?.(record.id);
        }
    }
}