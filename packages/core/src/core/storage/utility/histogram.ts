import {
    percentileHistogram,
    isDataAnomalyHistogram
} from '../../utility';

export interface HistogramSnapshot {
    buckets: number[];
    count: number;
    sum: number;
    average: number;
    sumOfSquares: number;

    p50: number;
    p95: number;
    p99: number;

    anomalyCount: number;
}

type RecordStatus = 'SUCCESS' | 'FAILED' | 'ANOMALY';

export class Histogram {
    private readonly limits = [
        5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100,
        120, 140, 160, 180, 200, 250, 300, 350, 400, 450, 500,
        550, 600, 700, 800, 900, 1000, 1500, 2000, 3000, 5000,
        Infinity,
    ];
    private readonly counters: Uint32Array;

    private totalCount = 0;
    private totalSum = 0;
    private totalSumOfSquares = 0;
    private anomalyCount = 0;

    constructor(
        private readonly anomalySampleSize: number = 60, //! For this use calculation
        private readonly anomalyLowerLimit: number = 180
    ) {
        this.counters = new Uint32Array(this.limits.length);
    }

    record(durationMs: number): RecordStatus {
        const isAnomaly = this.checkIfAnomaly(durationMs);

        this.totalCount++;
        this.totalSum += durationMs;
        this.totalSumOfSquares += durationMs * durationMs;

        for (let i = 0; i < this.limits.length; i++) {
            if (durationMs <= this.limits[i]) {
                this.counters[i]++;
                break;
            }
        }

        return isAnomaly ? 'ANOMALY' : 'SUCCESS';
    }

    snapshot(): HistogramSnapshot {
        return {
            buckets: Array.from(this.counters),
            count: this.totalCount,
            sum: this.totalSum,
            average: this.totalCount === 0 ? 0 : this.totalSum / this.totalCount,
            sumOfSquares: this.totalSumOfSquares,
            p50: this.percentile(0.50),
            p95: this.percentile(0.95),
            p99: this.percentile(0.99),
            anomalyCount: this.anomalyCount,
        };
    }

    private percentile(percent: number): number {
        return percentileHistogram(
            this.counters,
            this.totalCount,
            percent,
            this.limits
        );
    }

    private checkIfAnomaly(durationMs: number): boolean {
        if (
            this.totalCount < this.anomalySampleSize ||
            durationMs < this.anomalyLowerLimit
        ) return false;

        const isAnomaly = isDataAnomalyHistogram(
            durationMs,
            this.totalCount,
            this.totalSum,
            this.totalSumOfSquares
        );

        if (isAnomaly) {
            this.anomalyCount++;
            return true;
        }
        return false;
    }

    reset(): void {
        this.counters.fill(0);
        this.totalCount = 0;
        this.totalSum = 0;
        this.totalSumOfSquares = 0;
        this.anomalyCount = 0;
    }
}

/**
 * Calculates the tolerance for a given value based on the provided histogram limits.
 * @param value The value for which to calculate the tolerance.
 * @param limits An array of upper limits for each histogram bucket.
 * @returns The tolerance for the given value, which is the difference between the upper and lower limits of the bucket that contains the value.
 */
export function getBucketTolerance(value: number, limits: number[]): number {
    let lower = 0;
    for (const limit of limits) {
        if (value <= limit) {
            const upper = Number.isFinite(limit) ? limit : lower;
            return (upper - lower) + upper * 0.2; // 20% of the upper limit
        }
        lower = limit;
    }
    return 0;
}