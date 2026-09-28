import type { LocalRepository } from '../storage/local.repository';
import { calculateSampleSizeCorrelation } from '../utility/statistics';
import { analyzeCorrelation } from '../utility/correlation.analysis';
import {
    SystemAssessment,
    CorrelationPairResult,
    CorrelationDirection,
    type CorrelationData
} from '../domain';
import Logger from './logger';

type HistoryEntry = ReturnType<LocalRepository['bucket']['getHistory']>[number];

interface Metric {
    label: string;
    select: (entry: HistoryEntry) => number;
}

const METRICS = {
    rps: { label: 'RPS', select: e => e.rps.count },
    errorRate: { label: 'error rate', select: e => e.error.rate },
    heapUsage: { label: 'heap memory', select: e => e.health.memory.heapUsage },
    p95Latency: { label: 'p95 latency', select: e => e.latency.p95 },
    averageLatency: { label: 'average latency', select: e => e.latency.average },
    eventLoopLag: { label: 'event loop lag', select: e => e.health.eventLoop.lag }
} satisfies Record<string, Metric>;

type MetricKey = keyof typeof METRICS;

interface PairConfig {
    x: MetricKey;
    y: MetricKey;
    expectedDirection: Exclude<CorrelationDirection, 'NONE'>;
}

const PAIRS: readonly PairConfig[] = [
    { x: 'eventLoopLag', y: 'p95Latency', expectedDirection: 'POSITIVE' },
    { x: 'eventLoopLag', y: 'averageLatency', expectedDirection: 'POSITIVE' },
    { x: 'heapUsage', y: 'eventLoopLag', expectedDirection: 'POSITIVE' },
    { x: 'heapUsage', y: 'p95Latency', expectedDirection: 'POSITIVE' },
    { x: 'rps', y: 'errorRate', expectedDirection: 'POSITIVE' },
    { x: 'rps', y: 'p95Latency', expectedDirection: 'POSITIVE' }
];

const pairId = (x: MetricKey, y: MetricKey) => `${x}->${y}`;

interface CorrelationServiceOptions {
    minCorrelation?: number;
    alpha?: number;
    power?: number;
    strongThreshold?: number;
    maxLag?: number;
    maxWindow?: number;
    analysisIntervalMs?: number;
    alertCooldownMs?: number;
}

export class CorrelationService {
    readonly requiredSampleSize: number;

    private readonly storage: LocalRepository;
    private readonly strongThreshold: number;
    private readonly maxLag: number;
    private readonly maxWindow: number;
    private readonly analysisIntervalMs: number;
    private readonly alertCooldownMs: number;

    private lastRunAt = Number.NEGATIVE_INFINITY;
    private lastAlertAt = Number.NEGATIVE_INFINITY;
    private results: CorrelationPairResult[] = [];
    private assessment: SystemAssessment = {
        status: 'INSUFFICIENT_DATA',
        evidence: [],
        recommendation: 'Analysis not yet started.'
    };

    constructor(
        storage: LocalRepository,
        options: CorrelationServiceOptions = {}
    ) {
        this.storage = storage;
        this.requiredSampleSize = calculateSampleSizeCorrelation(
            options.minCorrelation ?? 0.5,
            options.alpha ?? 0.05,
            options.power ?? 0.8
        );
        this.strongThreshold = options.strongThreshold ?? 0.7;
        this.maxLag = options.maxLag ?? 5;
        this.maxWindow = Math.max(options.maxWindow ?? 300, this.requiredSampleSize);
        this.analysisIntervalMs = options.analysisIntervalMs ?? 1000;
        this.alertCooldownMs = options.alertCooldownMs ?? 30000;
    }

    getResults(): CorrelationPairResult[] {
        return this.results;
    }

    getAssessment(): SystemAssessment {
        return this.assessment;
    }

    pack(): CorrelationData {
        return {
            results: this.results,
            assessment: this.assessment
        };
    }

    tick(now: number = Date.now()): void {
        if (now - this.lastRunAt < this.analysisIntervalMs) return;
        this.lastRunAt = now;

        const history = this.storage.bucket.getHistory().slice(-this.maxWindow);

        const results: CorrelationPairResult[] = [];
        for (const pair of PAIRS) {
            const x = METRICS[pair.x];
            const y = METRICS[pair.y];

            try {
                const analysis = analyzeCorrelation(
                    history.map(x.select),
                    history.map(y.select),
                    this.requiredSampleSize,
                    {
                        strongThreshold: this.strongThreshold,
                        maxLag: this.maxLag,
                        xLabel: x.label,
                        yLabel: y.label
                    }
                );
                const unexpectedDirection = analysis.direction !== 'NONE' &&
                    analysis.direction !== pair.expectedDirection;

                results.push({
                    id: pairId(pair.x, pair.y),
                    xLabel: x.label,
                    yLabel: y.label,
                    expectedDirection: pair.expectedDirection,
                    unexpectedDirection,
                    analysis: unexpectedDirection
                        ? { ...analysis, recommendation: `${analysis.recommendation} The direction of the correlation is opposite to the expected one.` }
                        : analysis
                });
            } catch (err) {
                Logger.error(`Correlation analysis failed for ${pairId(pair.x, pair.y)}:`, err);
            }
        }

        this.results = results;
        this.assessment = this.assess(results);
        this.alertIfNeeded(now);
    }

    private isStrongPositive(id: string, results: CorrelationPairResult[]): boolean {
        const result = results.find(r => r.id === id);
        if (!result) return false;
        const { status, direction } = result.analysis;
        return (status === 'STRONG_LINEAR_ASSOCIATION' || status === 'STRONG_MONOTONIC_NONLINEAR_ASSOCIATION')
            && direction === 'POSITIVE';
    }

    private assess(results: CorrelationPairResult[]): SystemAssessment {
        const coreId = pairId('rps', 'p95Latency');
        const core = results.find(r => r.id === coreId);

        if (!core || core.analysis.status === 'INSUFFICIENT_DATA') {
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
