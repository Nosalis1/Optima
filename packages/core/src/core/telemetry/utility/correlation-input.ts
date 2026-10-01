import { analyzeCorrelation } from './correlation-analysis';
import { deriveMetrics } from '../../storage/stores/bucket-metric';
import type { SeriesPoint } from '../telemetry-query.service';
import type { CorrelationDirection } from '../../domain';
import {
    sha256,
    type CorrelationParameters,
    type CorrelationResult,
    type CorrelationTransform
} from './correlation-finding';

const finite = (n: number | null | undefined): number | null => typeof n === 'number' && Number.isFinite(n) ? n : null;

const whenRequests = (p: SeriesPoint, pick: (m: ReturnType<typeof deriveMetrics>) => number): number | null =>
    p.requests.requestCount > 0 ? finite(pick(deriveMetrics(p.requests, p.durationMs))) : null;

export interface Metric {
    label: string;
    select: (p: SeriesPoint) => number | null;
}

export const METRICS = {
    rps: { label: 'RPS', select: p => finite(deriveMetrics(p.requests, p.durationMs).rps) },
    errorRate: { label: 'error rate', select: p => whenRequests(p, m => m.errorRate) },
    heapUsage: { label: 'heap memory', select: p => finite(p.runtime.memoryUsage.heapUsage) },
    p95Latency: { label: 'p95 latency', select: p => whenRequests(p, m => m.p95) },
    averageLatency: { label: 'average latency', select: p => whenRequests(p, m => m.averageLatency) },
    eventLoopLag: { label: 'event loop lag', select: p => finite(p.runtime.loopDelay.meanMs) },
} satisfies Record<string, Metric>;

export type MetricKey = keyof typeof METRICS;

export interface PairConfig {
    x: MetricKey;
    y: MetricKey;
    expectedDirection: Exclude<CorrelationDirection, 'NONE'>;
}

export const PAIRS: readonly PairConfig[] = [
    { x: 'eventLoopLag', y: 'p95Latency', expectedDirection: 'POSITIVE' },
    { x: 'eventLoopLag', y: 'averageLatency', expectedDirection: 'POSITIVE' },
    { x: 'heapUsage', y: 'eventLoopLag', expectedDirection: 'POSITIVE' },
    { x: 'heapUsage', y: 'p95Latency', expectedDirection: 'POSITIVE' },
    { x: 'rps', y: 'errorRate', expectedDirection: 'POSITIVE' },
    { x: 'rps', y: 'p95Latency', expectedDirection: 'POSITIVE' }
];

export const pairId = (x: MetricKey, y: MetricKey) => `${x}->${y}`;

export interface PreparedSeries {
    xs: number[];
    ys: number[];
    sequences: number[];
    ranges: Array<[number, number]>;
    bucketCount: number;
    windowStart: string;
    windowEnd: string;
    windowEndSequence: number;
    expectedIntervals: number;
    validPairCount: number;
    droppedPairCount: number;
    coverage: number;
    qualityFlags: string[];
    digest: string;
}

const PROPAGATED_FLAGS = ['LATE_CLOSE', 'PARTIAL', 'MIXED_ORIGIN', 'CLOCK_SKEW'] as const;

function toRanges(points: readonly SeriesPoint[]): Array<[number, number]> {
    const ranges: Array<[number, number]> = [];
    for (const p of points) {
        const last = ranges[ranges.length - 1];
        if (last && p.sequenceFrom === last[1] + 1) last[1] = p.sequenceTo;
        else ranges.push([p.sequenceFrom, p.sequenceTo]);
    }
    return ranges;
}

function detrend(seq: number[], values: number[]): number[] {
    const n = values.length;
    if (n < 2) return values.slice();
    const t0 = seq[0];
    let st = 0, sv = 0, stt = 0, stv = 0;
    for (let i = 0; i < n; i++) {
        const t = seq[i] - t0;
        st += t; sv += values[i]; stt += t * t; stv += t * values[i];
    }
    const denom = n * stt - st * st;
    const slope = denom === 0 ? 0 : (n * stv - st * sv) / denom;
    const intercept = (sv - slope * st) / n;
    return values.map((v, i) => v - (intercept + slope * (seq[i] - t0)));
}

export function prepareSeries(
    points: readonly SeriesPoint[],
    pair: Pick<PairConfig, 'x' | 'y'>,
    transform: CorrelationTransform,
    minCoverage: number
): PreparedSeries {
    if (points.length === 0) throw new Error('prepareSeries: empty window');

    const x = METRICS[pair.x];
    const y = METRICS[pair.y];

    let seq: number[] = [];
    let xs: number[] = [];
    let ys: number[] = [];
    for (const p of points) {
        const vx = x.select(p);
        const vy = y.select(p);
        if (vx === null || vy === null) continue;
        seq.push(p.sequenceTo);
        xs.push(vx);
        ys.push(vy);
    }
    const afterPairing = seq.length;

    if (transform === 'difference') {
        const s2: number[] = [], x2: number[] = [], y2: number[] = [];
        for (let i = 1; i < seq.length; i++) {
            if (seq[i] !== seq[i - 1] + 1) continue;
            s2.push(seq[i]);
            x2.push(xs[i] - xs[i - 1]);
            y2.push(ys[i] - ys[i - 1]);
        }
        seq = s2; xs = x2; ys = y2;
    } else if (transform === 'detrend') {
        xs = detrend(seq, xs);
        ys = detrend(seq, ys);
    }

    const first = points[0];
    const last = points[points.length - 1];
    const expectedIntervals = last.sequenceTo - first.sequenceFrom + 1;
    const presentIntervals = points.reduce((s, p) => s + (p.sequenceTo - p.sequenceFrom + 1), 0);

    const flags = new Set<string>();
    if (presentIntervals < expectedIntervals) flags.add('GAPS');
    if (afterPairing < points.length) flags.add('INVALID_VALUES');
    if (seq.length < afterPairing) flags.add('TRANSFORM_LOSS');
    if (seq.length < expectedIntervals && transform !== 'difference') flags.add('COMPACTED_SERIES');
    for (const p of points) for (const f of p.qualityFlags) {
        if ((PROPAGATED_FLAGS as readonly string[]).includes(f)) flags.add(f);
    }

    const coverage = expectedIntervals > 0 ? seq.length / expectedIntervals : 0;
    if (coverage < minCoverage) flags.add('LOW_COVERAGE');

    const digest = sha256(JSON.stringify({ t: transform, s: seq, x: xs, y: ys }));

    return {
        xs, ys,
        sequences: seq,
        ranges: toRanges(points),
        bucketCount: points.reduce((s, p) => s + p.bucketCount, 0),
        windowStart: first.startTime,
        windowEnd: last.endTime,
        windowEndSequence: last.sequenceTo,
        expectedIntervals,
        validPairCount: seq.length,
        droppedPairCount: Math.max(0, expectedIntervals - seq.length),
        coverage,
        qualityFlags: [...flags].sort(),
        digest,
    };
}

export function runAnalysis(
    prepared: Pick<PreparedSeries, 'xs' | 'ys'>,
    pair: Pick<PairConfig, 'x' | 'y'>,
    params: CorrelationParameters
): CorrelationResult {
    return analyzeCorrelation(prepared.xs, prepared.ys, params.requiredSampleSize, {
        strongThreshold: params.strongThreshold,
        maxLag: params.maxLag,
        xLabel: METRICS[pair.x].label,
        yLabel: METRICS[pair.y].label,
    });
}