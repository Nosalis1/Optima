import { getConfig } from "../../config";

export class IntervalManager {
    private intervals: NodeJS.Timeout[] = [];

    constructor(
        private onTick: () => void,
        private onPublisherTick: () => void = () => { },
        private onPersistenceTick: () => void = () => { },
    ) { }

    startIntervals() {
        const config = getConfig();

        // Persistence Interval
        if (typeof config.persistence !== 'boolean') {
            this.startInterval(() => {
                this.onPersistenceTick();
            }, config.persistence.archiveIntervalMs ?? 24 * 60 * 60 * 1000);
        }

        // Publisher Interval
        this.startInterval(() => {
            this.onPublisherTick();
        }, config.publisher.intervalMs);

        // Tick Interval
        this.startInterval(() => {
            this.onTick();
        }, config.tickIntervalMs);
    }

    stopIntervals() {
        for (const interval of this.intervals) {
            this.stopInterval(interval);
        }
        this.intervals = [];
    }

    private startInterval(callback: () => void, intervalMs: number): NodeJS.Timeout {
        const interval = setInterval(callback, intervalMs);
        this.intervals.push(interval);
        return interval;
    }

    private stopInterval(interval: NodeJS.Timeout): void {
        clearInterval(interval);
        this.intervals = this.intervals.filter(i => i !== interval);
    }
}
