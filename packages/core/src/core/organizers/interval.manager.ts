import type { ReadonlyConfig } from "../../config";

interface TickCallback { (): void; }
interface TickCallbackAsync { (): Promise<void>; }

interface Interval { id: NodeJS.Timeout | null; callback: TickCallback | TickCallbackAsync | null; intervalMs: number; }

type IntervalType = 'tick' | 'publisher' | 'persistence';

export class IntervalManager {
    private intervals: Record<IntervalType, Interval | null> = { tick: null, publisher: null, persistence: null, };
    private initialized: boolean = false;
    private started: boolean = false;

    constructor(
        callbacks: Record<IntervalType, TickCallback | TickCallbackAsync | null>,
        private readonly config: ReadonlyConfig
    ) {
        this.intervals.tick = callbacks.tick ? {
            id: null,
            callback: callbacks.tick,
            intervalMs: config.tickIntervalMs,
        } : null;

        this.intervals.publisher = callbacks.publisher ? {
            id: null,
            callback: callbacks.publisher,
            intervalMs: config.publisher.intervalMs,
        } : null;

        if (config.persistence !== false) {
            this.intervals.persistence = callbacks.persistence ? {
                id: null,
                callback: callbacks.persistence,
                intervalMs: config.persistence.archiveIntervalMs ?? 24 * 60 * 60 * 1000,
            } : null;
        }
        this.initialized = true;
    }

    startIntervals() {
        if (!this.initialized || this.started) return;
        for (const intervalType in this.intervals) {
            const interval = this.intervals[intervalType as IntervalType];
            if (interval && interval.callback) {
                interval.id = setInterval(interval.callback, interval.intervalMs);
            }
        }
        this.started = true;
    }

    stopIntervals() {
        if (!this.initialized || !this.started) return;
        for (const intervalType in this.intervals) {
            const interval = this.intervals[intervalType as IntervalType];
            if (interval && interval.id) {
                clearInterval(interval.id);
                interval.id = null;
            }
        }
        this.started = false;
    }
}
