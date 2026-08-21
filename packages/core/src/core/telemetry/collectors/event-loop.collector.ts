import { monitorEventLoopDelay, IntervalHistogram } from 'perf_hooks';
import { ICollector } from './interface';
import { convertNanoseconds } from '../../utility';

type EventLoopUsageResult = {
    minMs: number;
    maxMs: number;
    meanMs: number;
    p50Ms: number;
    p99Ms: number;
}

class EventLoopCollector implements ICollector<EventLoopUsageResult> {
    private histogram: IntervalHistogram;

    constructor(
        readonly resolutionMs: number = 20,
        readonly thresholdMs: number = 100
    ) {
        this.histogram = monitorEventLoopDelay({ resolution: this.resolutionMs });
        this.histogram.enable();
    }

    public collect() {
        const toMs = (ns: number) => convertNanoseconds(ns, 'ms');

        return {
            minMs: toMs(this.histogram.min),
            maxMs: toMs(this.histogram.max),
            meanMs: toMs(this.histogram.mean),
            p50Ms: toMs(this.histogram.percentile(50)),
            p99Ms: toMs(this.histogram.percentile(99))
        };
    }
}

export { EventLoopCollector, EventLoopUsageResult };