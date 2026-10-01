import { calculateSampleSizeCorrelation } from '../utility/statistics';
import {
    SystemAssessment,
    CorrelationPairResult,
    type CorrelationData,
    type RelatedFinding
} from '../domain';
import Logger from './logger';
import type { TelemetryQueryService, SeriesPoint } from './telemetry-query.service';
import { verifyFinding, type ReplayOutcome } from './utility/correlation-replay';
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

export interface FindingStore {
    save(finding: CorrelationFinding): Promise<boolean>;
    find(findingId: string): Promise<CorrelationFinding | null>;
    readonly durable: boolean;
}

export interface CorrelationDeps {
    queries: TelemetryQueryService;
    finding: FindingStore;
    identity: { sessionId: () => string; instanceId: string; };
}

export interface CorrelationServiceOptions {
    minCorrelation: number;
    alpha: number;
    power: number;
    strongThreshold: number;
    maxLag: number;
    maxWindow: number;
    minCoverage: number;
    evaluateEveryIntervals: number;
    analysisIntervalMs: number;
}

const TRANSFORM: CorrelationTransform = 'raw';
const SCOPES: CorrelationScope[] = [{}];

type UiResult = CorrelationPairResult & { findingId: string };

export class CorrelationService {
    readonly requiredSampleSize: number;
    readonly parameters: CorrelationParameters;

    private readonly deps: CorrelationDeps;
    private readonly transform: CorrelationTransform;
    private readonly scopes: CorrelationScope[];
    private readonly analysisIntervalMs: number;
    private readonly evaluateEvery: number;

    private busy = false;
    private lastRunAt = Number.NEGATIVE_INFINITY;

    private readonly lastEvaluated = new Map<string, number>();

    private results: UiResult[] = [];
    private lowCoverage = new Set<string>();
    private assessment: SystemAssessment = {
        status: 'INSUFFICIENT_DATA',
        evidence: [],
        recommendation: 'Analysis not yet started.'
    };

    constructor(
        deps: CorrelationDeps,
        options: CorrelationServiceOptions
    ) {
        this.deps = deps;

        this.requiredSampleSize = calculateSampleSizeCorrelation(
            options.minCorrelation,
            options.alpha,
            options.power
        );
        this.parameters = {
            requiredSampleSize: this.requiredSampleSize,
            minCorrelation: options.minCorrelation,
            alpha: options.alpha,
            power: options.power,
            strongThreshold: options.strongThreshold,
            maxLag: options.maxLag,
            maxWindow: Math.max(options.maxWindow, this.requiredSampleSize),
            minCoverage: options.minCoverage,
            gapPolicy: 'compact',
        };
        this.transform = TRANSFORM;
        this.scopes = SCOPES;
        this.analysisIntervalMs = options.analysisIntervalMs;
        this.evaluateEvery = options.evaluateEveryIntervals;
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

        const durable = this.deps.finding.durable;
        const consistency = durable ? 'committed' : 'live';
        const bounds = this.deps.queries.latestWindow(this.parameters.maxWindow, consistency);
        if (!bounds) return;
        const endSequence = bounds.sequenceTo;

        for (let s = 0; s < this.scopes.length; s++) {
            const scope = this.scopes[s];

            const due = PAIRS.filter(pair => {
                const last = this.lastEvaluated.get(this.seriesFor(sessionId, scope, pair));
                return last === undefined || endSequence - last >= this.evaluateEvery;
            });
            if (due.length === 0) continue;

            const result = await this.deps.queries.query({
                sessionId,
                from: bounds.from,
                to: bounds.to,
                method: scope.method,
                route: scope.route,
                consistency,
            });
            const points = result.points.filter(p => p.sequenceFrom >= bounds.sequenceFrom && p.sequenceTo <= endSequence);
            if (points.length === 0) continue;

            const findings: CorrelationFinding[] = [];
            for (const pair of due) {
                const series = this.seriesFor(sessionId, scope, pair);
                this.lastEvaluated.set(series, endSequence);
                try {
                    findings.push(this.buildFinding(sessionId, scope, pair, points, now));
                } catch (err) {
                    Logger.error(`Correlation analysis failed for ${pairId(pair.x, pair.y)}:`, err);
                }
            }

            let committed: CorrelationFinding[];
            if (durable) {
                const saved = await Promise.all(findings.map(f => this.deps.finding.save(f).catch(() => false)));
                committed = findings.filter((f, i) => {
                    if (!saved[i]) Logger.error(`Correlation finding not persisted, not published: ${f.findingId}`);
                    return saved[i];
                });
            } else {
                committed = findings.map(f => ({ ...f, qualityFlags: [...f.qualityFlags, 'NOT_PERSISTED'].sort() }));
            }

            if (s === 0) dashboardFindings = committed;
        }

        if (dashboardFindings.length > 0) this.publish(dashboardFindings);
    }

    private seriesFor(sessionId: string, scope: CorrelationScope, pair: PairConfig): string {
        return seriesKey({
            sessionId, scope, pairId: pairId(pair.x, pair.y), resolutionMs: null,
            transform: this.transform, parameters: this.parameters,
        });
    }

    private buildFinding(sessionId: string, scope: CorrelationScope, pair: PairConfig, points: SeriesPoint[], now: number): CorrelationFinding {
        const pid = pairId(pair.x, pair.y);
        const prepared = prepareSeries(points, pair, this.transform, this.parameters.minCoverage);
        const result = runAnalysis(prepared, pair, this.parameters);

        const endSequence = prepared.windowEndSequence;
        const key = evaluationKey(this.seriesFor(sessionId, scope, pair), endSequence, prepared.digest);
        return {
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
    }

    async replay(findingId: string): Promise<ReplayOutcome> {
        const finding = await this.deps.finding.find(findingId);
        if (!finding) return { status: 'NOT_FOUND', findingId };
        return verifyFinding(this.deps.queries, finding);
    }

    private publish(findings: CorrelationFinding[]): void {
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

    relatedFindings(metric: string): RelatedFinding[] {
        return this.results
            .filter(r => {
                const [x, y] = r.id.split('->');
                return (x === metric || y === metric) && !this.lowCoverage.has(r.id)
                    && (r.analysis.status === 'STRONG_LINEAR_ASSOCIATION' || r.analysis.status === 'STRONG_MONOTONIC_NONLINEAR_ASSOCIATION');
            })
            .map(r => ({
                findingId: r.findingId,
                pairId: r.id,
                status: String(r.analysis.status),
                direction: String(r.analysis.direction),
                pearsonR: r.analysis.pearsonR,
            }));
    }
}
