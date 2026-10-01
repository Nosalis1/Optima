import {
    standardDeviation,
    linearDetrend,
    autocorrelation,
    effectiveSampleSize,
    pearsonCorrelation,
    spearmanCorrelation,
    determinationAndAlienation,
    difference,
    laggedCorrelation
} from '../../utility/statistics';
import {
    CorrelationStatus,
    CorrelationDirection,
    CorrelationAnalysis
} from '../../domain';

interface AnalyzeCorrelationOptions {
    strongThreshold?: number;
    maxLag?: number;
    xLabel?: string;
    yLabel?: string;
}

const DEFAULT_STRONG_THRESHOLD = 0.7;
const DEFAULT_MAX_LAG = 5;
const MIN_POINTS = 5;
const VARIATION_TOLERANCE = 1e-9;

function keepFinitePairs(x: number[], y: number[]): { x: number[]; y: number[] } {
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < x.length; i++) {
        if (Number.isFinite(x[i]) && Number.isFinite(y[i])) {
            xs.push(x[i]);
            ys.push(y[i]);
        }
    }
    return { x: xs, y: ys };
}

function isConstant(series: number[]): boolean {
    return series.every((value) => value === series[0]);
}

function hasNoVariation(series: number[], reference: number[]): boolean {
    const scale = Math.max(1, reference.reduce((max, v) => Math.max(max, Math.abs(v)), 0));
    return standardDeviation(series) <= VARIATION_TOLERANCE * scale;
}

function insufficient(sampleSize: number, requiredSampleSize: number, recommendation: string, partial: Partial<CorrelationAnalysis> = {}): CorrelationAnalysis {
    return {
        status: 'INSUFFICIENT_DATA',
        direction: 'NONE',
        pearsonR: 0,
        spearmanR: 0,
        rawPearsonR: 0,
        differencePearsonR: 0,
        determination: 0,
        lag: 0,
        laggedPearsonR: 0,
        sampleSize,
        effectiveSampleSize: 0,
        requiredSampleSize,
        autocorrelationX: 0,
        autocorrelationY: 0,
        trendDriven: false,
        recommendation,
        ...partial
    }
}

function signOf(value: number): CorrelationDirection {
    return value > 0 ? 'POSITIVE' : value < 0 ? 'NEGATIVE' : 'NONE';
}

export function analyzeCorrelation(xInput: number[], yInput: number[], requiredN: number, options: AnalyzeCorrelationOptions = {}): CorrelationAnalysis {
    if (xInput.length !== yInput.length) {
        throw new RangeError(`Series must have the same length (got ${xInput.length} and ${yInput.length})`);
    }

    const strong = options.strongThreshold ?? DEFAULT_STRONG_THRESHOLD;
    const maxLag = options.maxLag ?? DEFAULT_MAX_LAG;
    const xLabel = options.xLabel ?? 'X';
    const yLabel = options.yLabel ?? 'Y';

    const { x, y } = keepFinitePairs(xInput, yInput);
    const n = x.length;

    if (n < Math.max(requiredN, MIN_POINTS)) {
        return insufficient(n, requiredN, `Insufficient data points. At least ${requiredN} valid pairs of ${xLabel} and ${yLabel} are required.`);
    }

    if (isConstant(x) || isConstant(y)) {
        return insufficient(n, requiredN, `One of the series (${xLabel} or ${yLabel}) is constant. Correlation cannot be computed.`);
    }

    const dx = linearDetrend(x);
    const dy = linearDetrend(y);

    if (hasNoVariation(dx, x) || hasNoVariation(dy, y)) {
        return insufficient(n, requiredN, `One of the series (${xLabel} or ${yLabel}) has no variation after detrending. Correlation cannot be computed.`);
    }

    const autocorrelationX = autocorrelation(dx, 1);
    const autocorrelationY = autocorrelation(dy, 1);
    const nEff = effectiveSampleSize(n, autocorrelationX, autocorrelationY);

    if (nEff < requiredN) {
        return insufficient(n, requiredN, `Effective sample size is too small. At least ${requiredN} effective pairs of ${xLabel} and ${yLabel} are required.`, {
            effectiveSampleSize: nEff,
            autocorrelationX,
            autocorrelationY
        });
    }

    const pearsonR = pearsonCorrelation(dx, dy);
    const spearmanR = spearmanCorrelation(dx, dy);
    const rawPearsonR = pearsonCorrelation(x, y);
    const differencePearsonR = pearsonCorrelation(difference(x), difference(y));
    const { determination } = determinationAndAlienation(pearsonR);
    const lagged = laggedCorrelation(dx, dy, maxLag);

    let status: CorrelationStatus;
    let direction: CorrelationDirection;
    if (Math.abs(pearsonR) >= strong) {
        status = 'STRONG_LINEAR_ASSOCIATION';
        direction = signOf(pearsonR);
    } else if (Math.abs(spearmanR) >= strong) {
        status = 'STRONG_MONOTONIC_NONLINEAR_ASSOCIATION';
        direction = signOf(spearmanR);
    } else {
        status = 'NO_STRONG_ASSOCIATION';
        direction = 'NONE';
    }

    const trendDriven = Math.abs(rawPearsonR) >= strong && Math.abs(pearsonR) < strong;

    return {
        status,
        direction,
        pearsonR,
        spearmanR,
        rawPearsonR,
        differencePearsonR,
        determination,
        lag: lagged.lag,
        laggedPearsonR: lagged.r,
        sampleSize: n,
        effectiveSampleSize: nEff,
        requiredSampleSize: requiredN,
        autocorrelationX,
        autocorrelationY,
        trendDriven,
        recommendation: describe(status, direction, { pearsonR, spearmanR, rawPearsonR, lag: lagged.lag, laggedR: lagged.r, strong, trendDriven, xLabel, yLabel })
    }
}

interface DescribeContext {
    pearsonR: number;
    spearmanR: number;
    rawPearsonR: number;
    lag: number;
    laggedR: number;
    strong: number;
    trendDriven: boolean;
    xLabel: string;
    yLabel: string;
}

function describe(
    status: CorrelationStatus,
    direction: CorrelationDirection,
    ctx: DescribeContext
): string {
    const sign = direction === 'NEGATIVE' ? 'negative' : 'positive';
    const parts: string[] = [];

    if (status === 'STRONG_LINEAR_ASSOCIATION') {
        parts.push(`In the observed period a strong linear correlation (${sign}, r=${ctx.pearsonR.toFixed(2)}) was detected between ${ctx.xLabel} and ${ctx.yLabel}. Correlation does not prove causality.`);
    } else if (status === 'STRONG_MONOTONIC_NONLINEAR_ASSOCIATION') {
        parts.push(`In the observed period a strong monotonic nonlinear correlation (${sign}, ρ=${ctx.spearmanR.toFixed(2)}, r=${ctx.pearsonR.toFixed(2)}) was detected between ${ctx.xLabel} and ${ctx.yLabel}. The relationship could be logarithmic, threshold-based, saturating, or due to deviations; correlation does not prove causality.`);
    } else {
        parts.push(`In the observed period no strong correlational relationship was detected between ${ctx.xLabel} and ${ctx.yLabel}.`);
    }

    if (ctx.trendDriven) {
        parts.push(`The correlation is strong only on the raw series (r=${ctx.rawPearsonR.toFixed(2)}); it is possible that it is driven by a common trend.`);
    }

    if (ctx.lag !== 0 && Math.abs(ctx.laggedR) >= ctx.strong && status === 'NO_STRONG_ASSOCIATION') {
        const leader = ctx.lag > 0 ? ctx.xLabel : ctx.yLabel;
        const follower = ctx.lag > 0 ? ctx.yLabel : ctx.xLabel;
        parts.push(`At a lag of ${Math.abs(ctx.lag)} samples (${leader} leads ${follower}), a strong correlation (r=${ctx.laggedR.toFixed(2)}) was observed.`);
    }

    return parts.join(' ');
}