import type { CorrelationDirection, CorrelationStatus, SystemAssessment } from "../../domain";

export const STATUS_LABEL: Record<CorrelationStatus, string> = {
    INSUFFICIENT_DATA: 'Insufficient data',
    NO_STRONG_ASSOCIATION: 'No strong association',
    STRONG_LINEAR_ASSOCIATION: 'Strong linear',
    STRONG_MONOTONIC_NONLINEAR_ASSOCIATION: 'Strong monotonic',
};

export const STATUS_COLOR: Record<CorrelationStatus, string> = {
    INSUFFICIENT_DATA: 'var(--chart-1)',
    NO_STRONG_ASSOCIATION: 'var(--chart-6)',
    STRONG_LINEAR_ASSOCIATION: 'var(--chart-5)',
    STRONG_MONOTONIC_NONLINEAR_ASSOCIATION: 'var(--chart-4)',
};

export const DIRECTION_SYMBOL: Record<CorrelationDirection, string> = {
    POSITIVE: '↑',
    NEGATIVE: '↓',
    NONE: '–',
};

export const ASSESSMENT_LABEL: Record<SystemAssessment['status'], string> = {
    INSUFFICIENT_DATA: 'Insufficient data',
    NO_SATURATION_PATTERN: 'No saturation pattern',
    POSSIBLE_SATURATION: 'Possible saturation',
};

export const ASSESSMENT_COLOR: Record<SystemAssessment['status'], string> = {
    INSUFFICIENT_DATA: 'var(--chart-1)',
    NO_SATURATION_PATTERN: 'var(--chart-3)',
    POSSIBLE_SATURATION: 'var(--chart-5)',
};

export const formatR = (value: number) => value.toFixed(3);
