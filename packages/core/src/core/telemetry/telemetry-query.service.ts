import {
    createAggregate,
    mergeInto,
    mergeRuntimeInto,
    emptyRuntime,
    deriveMetrics,
    type MetricBucket,
    type RequestAggregate,
    type EndpointAggregate,
    type RuntimeInterval,
} from "../storage/stores/bucket-metric";

export type MetricsQuery = {
    sessionId: string;
    from: string;
    to: string;
    method?: string;
    route?: string;
    resolutionMs?: number;
    consistency: 'committed' | 'live';
    includeEndpoints?: boolean;
}

export type QueryIssue =
    | { type: 'CONFLICT'; bucketId: string }
    | { type: 'GAP'; fromSequence: number; toSequence: number }
    | { type: 'OUT_OF_ORDER'; bucketId: string }
    | { type: 'SOURCE_ERROR'; detail: string };

export interface SeriesPoint {
    startTime: string;
    endTime: string;
    durationMs: number;
    bucketCount: number;
    sequenceFrom: number;
    sequenceTo: number;
    requests: RequestAggregate;
    maxRps: number;
    endpoints?: EndpointAggregate[];
    runtime: RuntimeInterval;
    qualityFlags: string[];
    committed: boolean | null;
}

export interface MetricsQueryResult {
    query: MetricsQuery;
    points: SeriesPoint[];
    total: {
        requests: RequestAggregate;
        durationMs: number;
        bucketCount: number;
        maxRps: number;
        derived: ReturnType<typeof deriveMetrics>;
    };
    issues: QueryIssue[];
    complete: boolean;
}

export interface CommittedBucketSource {
    read(sessionId: string, fromMs: number, toMs: number, onIssue: (issue: QueryIssue) => void): AsyncIterable<MetricBucket>;
}

export interface LiveBucketEntry {
    bucket: MetricBucket;
    committed: boolean;
}

export interface LiveBucketSource {
    snapshot(): LiveBucketEntry[];
}

export interface TelemetryQueryDeps {
    committed: CommittedBucketSource;
    live: LiveBucketSource;
    currentSessionId: () => string;
}

function stableStringify(v: unknown): string {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

const fingerprint = (b: MetricBucket) => stableStringify(b);

function parseRange(q: MetricsQuery): { fromMs: number; toMs: number } {
    const fromMs = Date.parse(q.from);
    const toMs = Date.parse(q.to);
    if (Number.isNaN(fromMs) || Number.isNaN(toMs)) throw new RangeError('Invalid time range');
    if (fromMs > toMs) throw new RangeError('`from` must not be after `to`');
    return { fromMs, toMs };
}

const overlaps = (b: MetricBucket, fromMs: number, toMs: number) =>
    Date.parse(b.startTime) <= toMs && Date.parse(b.endTime) >= fromMs;

function project(b: MetricBucket, q: MetricsQuery): { requests: RequestAggregate; endpoints: EndpointAggregate[] } {
    if (!q.method && !q.route) return { requests: b.requests, endpoints: b.endpoints };
    const matching = b.endpoints.filter(e =>
        (!q.method || e.method === q.method) && (!q.route || e.route === q.route));
    const requests = createAggregate();
    for (const e of matching) mergeInto(requests, e);
    return { requests, endpoints: matching };
}

interface Group {
    startTime: string; endTime: string;
    durationMs: number; bucketCount: number;
    sequenceFrom: number; sequenceTo: number;
    requests: RequestAggregate;
    maxRps: number;
    endpoints?: Map<string, EndpointAggregate>;
    runtime: RuntimeInterval;
    flags: Set<string>;
    committedCount: number;
    uncommittedCount: number;
}

class SeriesAccumulator {
    private readonly groups = new Map<number, Group>();
    private readonly total = createAggregate();
    private totalDurationMs = 0;
    private maxRps = 0;
    private bucketCount = 0;
    private prevSequence: number | null = null;

    constructor(
        private readonly q: MetricsQuery,
        readonly issues: QueryIssue[]
    ) { }

    add(b: MetricBucket, committed: boolean | null): void {
        if (this.prevSequence !== null) {
            if (b.sequence <= this.prevSequence) {
                this.issues.push({ type: 'OUT_OF_ORDER', bucketId: b.bucketId });
            } else if (b.sequence > this.prevSequence + 1) {
                this.issues.push({ type: 'GAP', fromSequence: this.prevSequence + 1, toSequence: b.sequence - 1 });
            }
        }
        this.prevSequence = this.prevSequence === null ? b.sequence : Math.max(this.prevSequence, b.sequence);

        const p = project(b, this.q);
        this.bucketCount++;
        this.totalDurationMs += b.durationMs;
        mergeInto(this.total, p.requests);
        const bucketRps = deriveMetrics(p.requests, b.durationMs).rps;
        this.maxRps = Math.max(this.maxRps, bucketRps);

        const size = this.q.resolutionMs && this.q.resolutionMs > 0 ? this.q.resolutionMs : 0;
        const key = size ? Math.floor(Date.parse(b.startTime) / size) : b.sequence;

        let g = this.groups.get(key);
        if (!g) {
            g = {
                startTime: b.startTime, endTime: b.endTime,
                durationMs: 0, bucketCount: 0,
                sequenceFrom: b.sequence, sequenceTo: b.sequence,
                requests: createAggregate(),
                maxRps: 0,
                endpoints: this.q.includeEndpoints ? new Map() : undefined,
                runtime: emptyRuntime(),
                flags: new Set(),
                committedCount: 0,
                uncommittedCount: 0
            };
            this.groups.set(key, g);
        }

        mergeInto(g.requests, p.requests);
        g.maxRps = Math.max(g.maxRps, bucketRps);
        g.durationMs += b.durationMs;
        g.bucketCount++;
        if (committed === true) g.committedCount++;
        else if (committed === false) g.uncommittedCount++;
        if (b.startTime < g.startTime) g.startTime = b.startTime;
        if (b.endTime > g.endTime) g.endTime = b.endTime;
        g.sequenceFrom = Math.min(g.sequenceFrom, b.sequence);
        const isLatest = b.sequence >= g.sequenceTo;
        if (isLatest) g.sequenceTo = b.sequence;
        mergeRuntimeInto(g.runtime, b.runtime, isLatest);
        for (const f of b.qualityFlags) g.flags.add(f);

        if (g.endpoints) {
            for (const e of p.endpoints) {
                const ek = `${e.method}:${e.route}`;
                let t = g.endpoints.get(ek);
                if (!t) {
                    t = { method: e.method, route: e.route, ...createAggregate() };
                    g.endpoints.set(ek, t);
                }
                mergeInto(t, e);
            }
        }
    }

    finish(): MetricsQueryResult {
        const points: SeriesPoint[] = [...this.groups.values()]
            .sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
            .map(g => ({
                startTime: g.startTime,
                endTime: g.endTime,
                durationMs: g.durationMs,
                bucketCount: g.bucketCount,
                sequenceFrom: g.sequenceFrom,
                sequenceTo: g.sequenceTo,
                requests: g.requests,
                maxRps: g.maxRps,
                endpoints: g.endpoints ? [...g.endpoints.values()] : undefined,
                runtime: g.runtime,
                qualityFlags: [...g.flags].sort(),
                committed: g.uncommittedCount > 0 ? false : g.committedCount === g.bucketCount ? true : null
            }));

        return {
            query: this.q,
            points,
            total: {
                requests: this.total,
                durationMs: this.totalDurationMs,
                bucketCount: this.bucketCount,
                maxRps: this.maxRps,
                derived: deriveMetrics(this.total, this.totalDurationMs),
            },
            issues: this.issues,
            complete: this.issues.length === 0,
        };
    }
}

export class TelemetryQueryService {
    constructor(
        private readonly deps: TelemetryQueryDeps
    ) { }

    async query(q: MetricsQuery): Promise<MetricsQueryResult> {
        const issues: QueryIssue[] = [];
        const acc = new SeriesAccumulator(q, issues);
        for await (const e of this.buckets(q, i => issues.push(i))) acc.add(e.bucket, e.committed);
        return acc.finish();
    }

    recent(
        count: number,
        opts: Partial<Pick<MetricsQuery, 'consistency' | 'method' | 'route' | 'resolutionMs' | 'includeEndpoints'>> = {}
    ): MetricsQueryResult {
        const consistency = opts.consistency ?? 'live';
        const entries = this.deps.live.snapshot()
            .filter(e => consistency === 'live' || e.committed)
            .slice(-Math.max(0, count));

        const first = entries[0]?.bucket;
        const last = entries[entries.length - 1]?.bucket;
        const now = new Date().toISOString();
        const q: MetricsQuery = {
            sessionId: this.deps.currentSessionId(),
            from: first?.startTime ?? now,
            to: last?.endTime ?? now,
            consistency,
            method: opts.method,
            route: opts.route,
            resolutionMs: opts.resolutionMs,
            includeEndpoints: opts.includeEndpoints,
        };

        const acc = new SeriesAccumulator(q, []);
        for (const e of entries) acc.add(e.bucket, e.committed);
        return acc.finish();
    }

    latestWindow(count: number, consistency: MetricsQuery['consistency']): {
        sessionId: string; from: string; to: string; sequenceFrom: number; sequenceTo: number;
    } | null {
        const entries = this.deps.live.snapshot()
            .filter(e => consistency === 'live' || e.committed)
            .slice(-Math.max(1, count));
        if (entries.length === 0) return null;
        const first = entries[0].bucket;
        const last = entries[entries.length - 1].bucket;
        return {
            sessionId: this.deps.currentSessionId(),
            from: first.startTime,
            to: last.endTime,
            sequenceFrom: first.sequence,
            sequenceTo: last.sequence,
        };
    }

    liveBucket(sequence: number): MetricBucket | undefined {
        return this.deps.live.snapshot().find(e => e.bucket.sequence === sequence)?.bucket;
    }

    async *buckets(q: MetricsQuery, onIssue: (i: QueryIssue) => void): AsyncGenerator<LiveBucketEntry> {
        const { fromMs, toMs } = parseRange(q);
        const isCurrent = q.sessionId === this.deps.currentSessionId();

        const ramAll = isCurrent ? this.deps.live.snapshot() : [];
        const ram = ramAll.filter(e => overlaps(e.bucket, fromMs, toMs) && (q.consistency === 'live' || e.committed));
        const ramById = new Map(ram.map(e => [e.bucket.bucketId, e.bucket]));

        const oldest = ramAll[0]?.bucket;
        const covered = oldest !== undefined &&
            (oldest.sequence === 1 || Date.parse(oldest.startTime) <= fromMs);

        const handled = new Set<string>();

        if (!covered) {
            try {
                for await (const b of this.deps.committed.read(q.sessionId, fromMs, toMs, onIssue)) {
                    const mem = ramById.get(b.bucketId);
                    if (mem && fingerprint(mem) !== fingerprint(b)) {
                        handled.add(b.bucketId);
                        onIssue({ type: 'CONFLICT', bucketId: b.bucketId });
                        continue;
                    }
                    handled.add(b.bucketId);
                    yield { bucket: b, committed: true };
                }
            } catch (err) {
                onIssue({ type: 'SOURCE_ERROR', detail: err instanceof Error ? err.message : String(err) });
            }
        }

        for (const e of ram) {
            if (handled.has(e.bucket.bucketId)) continue;
            yield e;
        }
    }
}