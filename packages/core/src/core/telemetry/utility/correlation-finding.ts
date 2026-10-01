import { createHash } from 'crypto';
import type { analyzeCorrelation } from "./correlation-analysis";

export const CORRELATION_METHOD_VERSION = 'cor-2.0.0';
export const INPUT_SCHEMA_VERSION = 2;

export type CorrelationTransform = 'raw' | 'detrend' | 'difference';
export type CorrelationResult = ReturnType<typeof analyzeCorrelation>;

export interface CorrelationParameters {
    requiredSampleSize: number;
    minCorrelation: number;
    alpha: number;
    power: number;
    strongThreshold: number;
    maxLag: number;
    maxWindow: number;
    minCoverage: number;
    gapPolicy: 'compact';
}

export interface CorrelationScope {
    method?: string;
    route?: string;
}

export interface InputIdentity {
    sessionId: string;
    bucketCount: number;
    ranges: Array<[number, number]>;
    digest: string;
}

export type CorrelationFinding = {
    findingId: string;
    evaluationKey: string;
    sessionId: string;
    instanceId: string;
    scope: CorrelationScope;
    metricX: string;
    metricY: string;
    windowStart: string;
    windowEnd: string;
    resolutionMs: number | null;
    transform: CorrelationTransform;
    methodVersion: string;
    parameters: CorrelationParameters;
    input: InputIdentity;
    inputSchemaVersion: number;
    createdAt: string;
    source: 'live' | 'replay';
    validPairCount: number;
    droppedPairCount: number;
    coverage: number;
    qualityFlags: string[];
    result: CorrelationResult;
};

export function stableStringify(v: unknown): string {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map(k => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export const scopeKey = (s: CorrelationScope) =>
    s.method || s.route ? `${s.method ?? '*'} ${s.route ?? '*'}` : 'service';

export const parametersHash = (p: CorrelationParameters) => sha256(stableStringify(p)).slice(0, 12);

export function seriesKey(a: {
    sessionId: string;
    scope: CorrelationScope;
    pairId: string;
    resolutionMs: number | null;
    transform: CorrelationTransform;
    parameters: CorrelationParameters;
}): string {
    return [
        a.sessionId,
        scopeKey(a.scope),
        a.pairId,
        a.resolutionMs ?? 'raw',
        a.transform,
        CORRELATION_METHOD_VERSION,
        parametersHash(a.parameters),
    ].join('|');
}

export function evaluationKey(series: string, windowEndSequence: number, inputDigest: string): string {
    return `${series}|end=${windowEndSequence}|in=${inputDigest}`;
}

export function findingIdFor(a: {
    sessionId: string;
    scope: CorrelationScope;
    pairId: string;
    windowEndSequence: number;
    evaluationKey: string;
}): string {
    return `${a.sessionId}:${encodeURIComponent(scopeKey(a.scope))}:${a.pairId}:${a.windowEndSequence}:${sha256(a.evaluationKey).slice(0, 8)}`;
}