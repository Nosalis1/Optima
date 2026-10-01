import { RingBuffer } from "../utility";
import {
    createAggregate,
    recordInto,
    deepFreeze,
    BUCKET_SCHEMA_VERSION,
    type MetricBucket,
    type RequestAggregate,
    type Origin
} from './bucket-metric';
import type { RuntimeStore } from "./runtime.store";

export interface BucketStoreOptions {
    sessionId: string;
    instanceId: string;
    intervalMs?: number;
    historySize?: number;
    maxEndpoints?: number;
    originProvider?: () => Origin;
}

interface OpenInterval {
    startHr: bigint;
    startWall: number;
    requests: RequestAggregate;
    endpoints: Map<string, { method: string; route: string; aggregate: RequestAggregate; }>;
    flags: Set<string>;
    syntheticSeen: boolean;
    realSeen: boolean;
}

export class BucketStore {
    private readonly history: RingBuffer<MetricBucket>;
    private readonly intervalMs: number;
    private readonly maxEndpoints: number;
    private sequence = 0;
    private lastCommitted = 0;
    private readonly committed = new Set<number>();
    private open: OpenInterval;
    private sealed = false;
    private _droppedAfterSeal = 0;

    constructor(
        private readonly runtime: RuntimeStore,
        private readonly options: BucketStoreOptions
    ) {
        this.intervalMs = options.intervalMs ?? 1000;
        this.maxEndpoints = options.maxEndpoints ?? 200;
        this.history = new RingBuffer<MetricBucket>(options.historySize ?? 60);
        this.open = this.openInterval(Date.now(), process.hrtime.bigint());
    }

    record(input: { method: string; route: string; duration: number; statusCode: number; origin?: Origin }): void {
        if (this.sealed) { this._droppedAfterSeal++; return; }
        const cur = this.open;
        if (!recordInto(cur.requests, input.duration, input.statusCode)) return;

        const origin = input.origin ?? this.options.originProvider?.() ?? 'real';
        if (origin === 'synthetic') cur.syntheticSeen = true;
        else cur.realSeen = true;

        let key = `${input.method}:${input.route}`;
        let entry = cur.endpoints.get(key);
        if (!entry && cur.endpoints.size >= this.maxEndpoints) {
            cur.flags.add('ENDPOINT_OVERFLOW');
            key = 'OTHER:__overflow__';
            entry = cur.endpoints.get(key);
        }
        if (!entry) {
            const overflow = key === 'OTHER:__overflow__';
            entry = {
                method: overflow ? 'OTHER' : input.method,
                route: overflow ? '__overflow__' : input.route,
                aggregate: createAggregate()
            };
            cur.endpoints.set(key, entry);
        }
        recordInto(entry.aggregate, input.duration, input.statusCode);
    }

    flush(opts: { force?: boolean; seal?: boolean } = {}): MetricBucket | null {
        if (this.sealed) return null;
        if (opts.seal) this.sealed = true;
        const nowHr = process.hrtime.bigint();
        const cur = this.open;
        const elapsedMs = Number(nowHr - cur.startHr) / 1e6;
        if (!opts.force && elapsedMs < this.intervalMs) return null;
        if (opts.force && elapsedMs < 1 && cur.requests.requestCount === 0) return null;

        const endWall = Date.now();
        const flags = new Set(cur.flags);
        if (elapsedMs > this.intervalMs * 1.5) flags.add('LATE_CLOSE');
        if (opts.force && elapsedMs < this.intervalMs) flags.add('PARTIAL');
        if (cur.syntheticSeen && cur.realSeen) flags.add('MIXED_ORIGIN');
        if (Math.abs((endWall - cur.startWall) - elapsedMs) > 500) flags.add('CLOCK_SKEW');

        const sequence = ++this.sequence;
        const origin: Origin = cur.syntheticSeen ? 'synthetic' : cur.realSeen ? 'real' : (this.options.originProvider?.() ?? 'real');

        const runtime = this.runtime.closeInterval();

        const bucket = deepFreeze<MetricBucket>({
            schemaVersion: BUCKET_SCHEMA_VERSION,
            bucketId: `${this.options.sessionId}:${sequence}`,
            sessionId: this.options.sessionId,
            instanceId: this.options.instanceId,
            sequence,
            startTime: new Date(cur.startWall).toISOString(),
            endTime: new Date(endWall).toISOString(),
            durationMs: Math.round(elapsedMs * 1000) / 1000,
            origin,
            requests: cur.requests,
            runtime,
            endpoints: [...cur.endpoints.values()].map(e => ({ method: e.method, route: e.route, ...e.aggregate })),
            qualityFlags: [...flags],
        });

        this.history.push(bucket);
        this.open = this.openInterval(endWall, nowHr);
        return bucket;
    }

    get instanceId(): string { return this.options.instanceId; }
    markCommitted(sequence: number): void {
        this.committed.add(sequence);
        if (sequence > this.lastCommitted) this.lastCommitted = sequence;
        const oldest = this.history.values()[0]?.sequence ?? sequence;
        for (const s of this.committed) if (s < oldest) this.committed.delete(s);
    }
    isCommitted(sequence: number): boolean { return this.committed.has(sequence); }
    get lastCommittedSequence(): number { return this.lastCommitted; }
    get droppedAfterSeal(): number { return this._droppedAfterSeal; }
    getHistory(): MetricBucket[] { return this.history.values(); }
    latest(): MetricBucket | undefined { return this.history.latest(); }

    private openInterval(startWall: number, startHr: bigint): OpenInterval {
        return {
            startHr, startWall,
            requests: createAggregate(),
            endpoints: new Map(),
            flags: new Set(),
            syntheticSeen: false,
            realSeen: false
        };
    }
}
