import v8 from 'node:v8';
import { PerformanceObserver, constants } from 'node:perf_hooks';
import { ICollector } from './interface';
import { convertBytes } from '../../utility';

type GCUsageResult = {
    gcCount: number;
    gcTime: number;
    gcPauseAverage: number;
    minorGC: { runCount: number; averageTime: number; };
    majorGC: { runCount: number; averageTime: number; };
    incrementalGC: { runCount: number; averageTime: number; };
    heapSpaces: { label: string; used: number; }[];
    gcTotals: { totalPauseTime: number; freedMemory: number; promotions: number; tenuredSize: number; };
}

class GCCollector implements ICollector<GCUsageResult> {

    private gcStats: {
        gcCount: number;
        gcTime: number;
        gcPauseAverage: number;
        minorGC: { runCount: number; totalTime: number; };
        majorGC: { runCount: number; totalTime: number; };
        incrementalGC: { runCount: number; totalTime: number; };
        freedMemory: number;
    };

    private gcObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
            const duration = entry.duration;
            this.gcStats.gcCount++;
            this.gcStats.gcTime += duration;

            const detail = (entry as any).detail;
            const kind = detail ? detail.kind : 0;

            if (kind === 1) { // Minor GC
                this.gcStats.minorGC.runCount++;
                this.gcStats.minorGC.totalTime += duration;
            } else if (kind === 2) { // Major GC
                this.gcStats.majorGC.runCount++;
                this.gcStats.majorGC.totalTime += duration;
            } else { // Incremental GC
                this.gcStats.incrementalGC.runCount++;
                this.gcStats.incrementalGC.totalTime += duration;
            }

            if (detail) {
                if (detail.freedMemory) this.gcStats.freedMemory += detail.freedMemory;
            }
        }
    });

    constructor() {
        this.gcStats = {
            gcCount: 0,
            gcTime: 0,
            gcPauseAverage: 0,
            minorGC: { runCount: 0, totalTime: 0 },
            majorGC: { runCount: 0, totalTime: 0 },
            incrementalGC: { runCount: 0, totalTime: 0 },
            freedMemory: 0
        };
        this.gcObserver.observe({ entryTypes: ['gc'], buffered: true });
    }

    public collect() {
        const spaceStats = v8.getHeapSpaceStatistics();
        const heapSpaces = spaceStats.map(space => ({
            label: space.space_name,
            used: space.space_used_size / 1024 / 1024
        }));

        const tenuredSpace = spaceStats.find(s => s.space_name === 'old_space');

        const parseFloatFixed = (value: number) => parseFloat(value.toFixed(2));
        const parseFloatSafe = (value: number, condition: boolean) => condition ? parseFloatFixed(value) : 0;

        return {
            gcCount: this.gcStats.gcCount,
            gcTime: parseFloatFixed(this.gcStats.gcTime),
            gcPauseAverage: parseFloatSafe(
                this.gcStats.gcTime / this.gcStats.gcCount,
                this.gcStats.gcCount > 0
            ),

            minorGC: {
                runCount: this.gcStats.minorGC.runCount,
                averageTime: parseFloatSafe(
                    this.gcStats.minorGC.totalTime / this.gcStats.minorGC.runCount,
                    this.gcStats.minorGC.runCount > 0
                )
            },
            majorGC: {
                runCount: this.gcStats.majorGC.runCount,
                averageTime: parseFloatSafe(
                    this.gcStats.majorGC.totalTime / this.gcStats.majorGC.runCount,
                    this.gcStats.majorGC.runCount > 0
                )
            },
            incrementalGC: {
                runCount: this.gcStats.incrementalGC.runCount,
                averageTime: parseFloatSafe(
                    this.gcStats.incrementalGC.totalTime / this.gcStats.incrementalGC.runCount,
                    this.gcStats.incrementalGC.runCount > 0
                )
            },
            heapSpaces,
            gcTotals: {
                totalPauseTime: parseFloatFixed(this.gcStats.gcTime),
                freedMemory: convertBytes(this.gcStats.freedMemory, 'MB'),
                promotions: this.gcStats.majorGC.runCount,
                tenuredSize: tenuredSpace ? tenuredSpace.space_used_size / 1024 / 1024 : 0
            }
        };
    }
};

export { GCCollector, GCUsageResult };