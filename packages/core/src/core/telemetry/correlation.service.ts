import type { LocalRepository } from '../storage/local.repository';
import { calculateSampleSizeCorrelation } from '../utility/statistics';
import {
    SystemAssessment,
    CorrelationPairResult,
    type CorrelationData
} from '../domain';
import Logger from './logger';
import type { TelemetryQueryService } from './telemetry-query.service';
import {
    CORRELATION_METHOD_VERSION,
    INPUT_SCHEMA_VERSION,
    evaluationKey,
    findingIdFor,
    seriesKey,
    type CorrelationFinding,
    type CorrelationParameters,
    type CorrelationScope,
    type CorrelationTransform,
} from './utility/correlation-finding';
import {
    METRICS,
    PAIRS,
    pairId,
    prepareSeries,
    runAnalysis,
    type PairConfig
} from './utility/correlation-input';

export interface FindingSink {
    save(finding: CorrelationFinding): Promise<boolean>;
}

export interface CorrelationDeps {
    queries: TelemetryQueryService;
    finding: FindingSink;
    identity: { sessionId: () => string; instanceId: string; };
}

interface CorrelationServiceOptions {
    minCorrelation?: number;
    alpha?: number;
    power?: number;
    strongThreshold?: number;
    maxLag?: number;
    maxWindow?: number;
    minCoverage?: number;
    analysisIntervalMs?: number;
    alertCooldownMs?: number;
    transform?: CorrelationTransform;
    scopes?: CorrelationScope[];
    evaluateEveryIntervals?: number;
    persistEveryIntervals?: number;
}

type UiResult = CorrelationPairResult & { findingId: string };

export class CorrelationService {
    readonly requiredSampleSize: number;
    readonly parameters: CorrelationParameters;

    private readonly storage: LocalRepository;
    private readonly deps: CorrelationDeps;
    private readonly transform: CorrelationTransform;
    private readonly scopes: CorrelationScope[];
    private readonly analysisIntervalMs: number;
    private readonly alertCooldownMs: number;
    private readonly evaluateEvery: number;
    private readonly persistEvery: number;

    private busy = false;
    private lastRunAt = Number.NEGATIVE_INFINITY;
    private lastAlertAt = Number.NEGATIVE_INFINITY;

    private readonly lastEvaluated = new Map<string, number>();
    private readonly lastPersisted = new Map<string, { status: string; direction: string; endSequence: number }>();

    private results: UiResult[] = [];
    private lowCoverage = new Set<string>();
    private assessment: SystemAssessment = {
        status: 'INSUFFICIENT_DATA',
        evidence: [],
        recommendation: 'Analysis not yet started.'
    };

    constructor(
        storage: LocalRepository,
        deps: CorrelationDeps,
        options: CorrelationServiceOptions = {}
    ) {
        this.storage = storage;
        this.deps = deps;

        this.requiredSampleSize = calculateSampleSizeCorrelation(
            options.minCorrelation ?? 0.5,
            options.alpha ?? 0.05,
            options.power ?? 0.8
        );
        this.parameters = {
            requiredSampleSize: this.requiredSampleSize,
            minCorrelation: options.minCorrelation ?? 0.5,
            alpha: options.alpha ?? 0.05,
            power: options.power ?? 0.8,
            strongThreshold: options.strongThreshold ?? 0.7,
            maxLag: options.maxLag ?? 5,
            maxWindow: Math.max(options.maxWindow ?? 300, this.requiredSampleSize),
            minCoverage: options.minCoverage ?? 0.8,
            gapPolicy: 'compact',
        };
        this.transform = options.transform ?? 'raw';
        this.scopes = options.scopes?.length ? options.scopes : [{}];
        this.analysisIntervalMs = options.analysisIntervalMs ?? 1000;
        this.alertCooldownMs = options.alertCooldownMs ?? 30000;
        this.evaluateEvery = Math.max(1, options.evaluateEveryIntervals ?? 1);
        this.persistEvery = Math.max(1, options.persistEveryIntervals ?? 30);
    }

    getResults(): CorrelationPairResult[] { return this.results; }
    getAssessment(): SystemAssessment { return this.assessment; }
    pack(): CorrelationData { return { results: this.results, assessment: this.assessment }; }

    tick(now: number = Date.now()): void {
        if (this.busy) return;
        if (now - this.lastRunAt < this.analysisIntervalMs) return;
        this.lastRunAt = now;

        this.busy = true;
        this.evaluate(now)
            .catch(err => Logger.error('Correlation evaluation failed:', err))
            .finally(() => { this.busy = false; });
    }

    private async evaluate(now: number): Promise<void> {
        const sessionId = this.deps.identity.sessionId();
        let dashboardFindings: CorrelationFinding[] = [];

        for (let s = 0; s < this.scopes.length; s++) {
            const scope = this.scopes[s];
            const query = this.deps.queries.recent(this.parameters.maxWindow, {
                consistency: 'committed',
                method: scope.method,
                route: scope.route
            });
            const points = query.points;
            if (points.length === 0) continue;

            const endSequence = points[points.length - 1].sequenceTo;
            const findings: CorrelationFinding[] = [];
            const toPersist: Array<{
                finding: CorrelationFinding;
                series: string;
            }> = [];

            for (const pair of PAIRS) {
                const pid = pairId(pair.x, pair.y);
                const series = seriesKey({
                    sessionId, scope, pairId: pid, resolutionMs: null,
                    transform: this.transform, parameters: this.parameters,
                });

                const last = this.lastEvaluated.get(series);
                if (last !== undefined && endSequence - last < this.evaluateEvery) continue;

                try {
                    const prepared = prepareSeries(points, pair, this.transform, this.parameters.minCoverage);
                    const result = runAnalysis(prepared, pair, this.parameters);

                    const key = evaluationKey(series, endSequence, prepared.digest);
                    const finding: CorrelationFinding = {
                        findingId: findingIdFor({ sessionId, scope, pairId: pid, windowEndSequence: endSequence, evaluationKey: key }),
                        evaluationKey: key,
                        sessionId,
                        instanceId: this.deps.identity.instanceId,
                        scope,
                        metricX: pair.x,
                        metricY: pair.y,
                        windowStart: prepared.windowStart,
                        windowEnd: prepared.windowEnd,
                        resolutionMs: null,
                        transform: this.transform,
                        methodVersion: CORRELATION_METHOD_VERSION,
                        parameters: this.parameters,
                        input: {
                            sessionId,
                            bucketCount: prepared.bucketCount,
                            ranges: prepared.ranges,
                            digest: prepared.digest,
                        },
                        inputSchemaVersion: INPUT_SCHEMA_VERSION,
                        createdAt: new Date(now).toISOString(),
                        source: 'live',
                        validPairCount: prepared.validPairCount,
                        droppedPairCount: prepared.droppedPairCount,
                        coverage: prepared.coverage,
                        qualityFlags: prepared.qualityFlags,
                        result,
                    };

                    this.lastEvaluated.set(series, endSequence);
                    findings.push(finding);
                    if (this.shouldPersist(series, finding, endSequence)) toPersist.push({ finding, series });
                } catch (err) {
                    Logger.error(`Correlation analysis failed for ${pid}:`, err);
                }
            }

            const saved = await Promise.all(toPersist.map(t =>
                this.deps.finding.save(t.finding).catch(() => false)));
            toPersist.forEach((t, i) => {
                if (saved[i]) {
                    this.lastPersisted.set(t.series, {
                        status: String(t.finding.result.status),
                        direction: String(t.finding.result.direction),
                        endSequence,
                    });
                } else {
                    Logger.error(`Correlation finding not persisted: ${t.finding.findingId}`);
                }
            });

            if (s === 0) dashboardFindings = findings;
        }

        if (dashboardFindings.length > 0) this.publish(dashboardFindings, now);
    }

    private shouldPersist(series: string, f: CorrelationFinding, endSequence: number): boolean {
        if (f.result.status === 'INSUFFICIENT_DATA') return false;
        const prev = this.lastPersisted.get(series);
        if (!prev) return true;
        if (prev.status !== String(f.result.status) || prev.direction !== String(f.result.direction)) return true;
        return endSequence - prev.endSequence >= this.persistEvery;
    }

    private publish(findings: CorrelationFinding[], now: number): void {
        const byId = new Map(findings.map(f => [`${f.metricX}->${f.metricY}`, f]));
        const results: UiResult[] = [];
        const lowCoverage = new Set<string>();

        for (const pair of PAIRS) {
            const id = pairId(pair.x, pair.y);
            const f = byId.get(id);
            if (!f) continue;
            if (f.qualityFlags.includes('LOW_COVERAGE')) lowCoverage.add(id);
            results.push(this.toUiResult(pair, f));
        }

        this.results = results;
        this.lowCoverage = lowCoverage;
        this.assessment = this.assess(results);
        this.alertIfNeeded(now);
    }

    private toUiResult(pair: PairConfig, f: CorrelationFinding): UiResult {
        const x = METRICS[pair.x];
        const y = METRICS[pair.y];
        const unexpectedDirection = f.result.direction !== 'NONE' && f.result.direction !== pair.expectedDirection;
        return {
            id: pairId(pair.x, pair.y),
            xLabel: x.label,
            yLabel: y.label,
            expectedDirection: pair.expectedDirection,
            unexpectedDirection,
            analysis: unexpectedDirection
                ? { ...f.result, recommendation: `${f.result.recommendation} The direction of the correlation is opposite to the expected one.` }
                : f.result,
            findingId: f.findingId,
        };
    }

    private isStrongPositive(id: string, results: CorrelationPairResult[]): boolean {
        if (this.lowCoverage.has(id)) return false;
        const result = results.find(r => r.id === id);
        if (!result) return false;
        const { status, direction } = result.analysis;
        return (status === 'STRONG_LINEAR_ASSOCIATION' || status === 'STRONG_MONOTONIC_NONLINEAR_ASSOCIATION')
            && direction === 'POSITIVE';
    }

    private assess(results: CorrelationPairResult[]): SystemAssessment {
        const coreId = pairId('rps', 'p95Latency');
        const core = results.find(r => r.id === coreId);

        if (!core || core.analysis.status === 'INSUFFICIENT_DATA' || this.lowCoverage.has(coreId)) {
            return {
                status: 'INSUFFICIENT_DATA',
                evidence: [],
                recommendation: 'No sufficient data to assess the saturation pattern.'
            };
        }

        const supporting: Array<{ id: string; text: string }> = [
            { id: pairId('eventLoopLag', 'p95Latency'), text: 'Event Loop Lag ↔ p95 Latency' },
            { id: pairId('rps', 'errorRate'), text: 'RPS ↔ error rate' }
        ];

        const evidence: string[] = [];
        if (this.isStrongPositive(coreId, results)) {
            evidence.push('RPS ↔ p95 Latency');
            for (const item of supporting) {
                if (this.isStrongPositive(item.id, results)) evidence.push(item.text);
            }
        }

        if (evidence.length >= 2) {
            return {
                status: 'POSSIBLE_SATURATION',
                evidence,
                recommendation: `Possible saturation pattern: in the observed period there is a strong positive correlation (${evidence.join('; ')}). Correlation does not prove causality; check CPU, GC and external dependencies.`
            };
        }

        return {
            status: 'NO_SATURATION_PATTERN',
            evidence,
            recommendation: 'In the observed period, no pattern indicating saturation was detected.'
        };
    }

    private alertIfNeeded(now: number): void {
        if (this.assessment.status !== 'POSSIBLE_SATURATION') return;
        if (now - this.lastAlertAt < this.alertCooldownMs) return;

        this.lastAlertAt = now;
        this.storage.alerts.warning(this.assessment.recommendation);
    }
}
