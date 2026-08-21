import {
    Histogram,
    HistogramSnapshot
} from '../utility';

export interface MetricsSnapshot {
    requestCount: number;

    errorClientCount: number;
    errorServerCount: number;

    averageLatency: number;

    errorRate: number;

    latency: HistogramSnapshot;
}

export class MetricsStore {

    private requestCount: number;
    private errorClientCount: number;
    private errorServerCount: number;

    private totalLatency: number;

    private readonly histogram: Histogram;

    constructor(
    ) {
        this.requestCount = 0;
        this.errorClientCount = 0;
        this.errorServerCount = 0;

        this.totalLatency = 0;

        this.histogram = new Histogram();
    }

    record(input: { duration: number; statusCode: number; }) {
        this.requestCount++;

        this.totalLatency += input.duration;
        const status = this.histogram.record(input.duration);

        if (input.statusCode >= 400 && input.statusCode < 500) {
            this.errorClientCount++;
        } else if (input.statusCode >= 500) {
            this.errorServerCount++;
        }

        return status;
    }

    snapshot(): MetricsSnapshot {
        const latency = this.histogram.snapshot();
        return {
            requestCount: this.requestCount,
            errorClientCount: this.errorClientCount,
            errorServerCount: this.errorServerCount,
            averageLatency: this.requestCount === 0 ? 0 : this.totalLatency / this.requestCount,
            errorRate: this.requestCount === 0 ? 0 : (this.errorClientCount + this.errorServerCount) / this.requestCount,
            latency,
        };
    }

    reset() {
        this.requestCount = 0;
        this.errorClientCount = 0;
        this.errorServerCount = 0;
        this.totalLatency = 0;
        this.histogram.reset();
    }
}