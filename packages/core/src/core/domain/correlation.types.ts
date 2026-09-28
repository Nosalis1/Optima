
export interface SystemAssessment {
    status: 'INSUFFICIENT_DATA' | 'NO_SATURATION_PATTERN' | 'POSSIBLE_SATURATION';
    evidence: string[];
    recommendation: string;
}

export type CorrelationStatus =
    | 'INSUFFICIENT_DATA'
    | 'NO_STRONG_ASSOCIATION'
    | 'STRONG_LINEAR_ASSOCIATION'
    | 'STRONG_MONOTONIC_NONLINEAR_ASSOCIATION';

export type CorrelationDirection = 'POSITIVE' | 'NEGATIVE' | 'NONE';

export interface CorrelationAnalysis {
    status: CorrelationStatus;
    direction: CorrelationDirection;
    pearsonR: number;
    spearmanR: number;
    rawPearsonR: number;
    differencePearsonR: number;
    determination: number;
    lag: number;
    laggedPearsonR: number;
    sampleSize: number;
    effectiveSampleSize: number;
    requiredSampleSize: number;
    autocorrelationX: number;
    autocorrelationY: number;
    trendDriven: boolean;
    recommendation: string;
}

export interface CorrelationPairResult {
    id: string;
    xLabel: string;
    yLabel: string;
    expectedDirection: Exclude<CorrelationDirection, 'NONE'>;
    unexpectedDirection: boolean;
    analysis: CorrelationAnalysis;
}

export interface CorrelationData {
    results: CorrelationPairResult[];
    assessment: SystemAssessment;
}