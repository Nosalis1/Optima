import type { ReadonlyConfig } from "../../config";
import type { HealthDetails, SystemStaticInfo } from "../domain";
import type { LocalRepository } from "../storage";

export class RuntimeService {
    readonly eventLoopLagThresholdMs: number;
    readonly env: string;
    readonly startedAt: number;
    readonly nodeVersion: string;

    constructor(
        private readonly storage: LocalRepository,
        private readonly config: ReadonlyConfig
    ) {
        this.eventLoopLagThresholdMs = config.thresholds.eventLoopLagMs;
        this.env = process.env.NODE_ENV ?? 'unknown';
        this.nodeVersion = process.version;
        this.startedAt = Date.now();
    }

    getSystemStaticInfo(): SystemStaticInfo {
        return {
            uptime: Date.now() - this.startedAt,
            nodeVersion: this.nodeVersion,
            env: this.env
        };
    }

    get(): HealthDetails {
        const details = this.storage.runtime.details();
        const gc = details.gc;
        return {
            cpu: {
                numberOfCores: details.numberOfCores,
                perCoreUsage: details.perCoreUsage,
            },
            memory: {
                rssMemoryTotal: details.rssMemoryTotal,
                externalMemory: details.externalMemory,
            },
            eventLoop: {
                threshold: this.eventLoopLagThresholdMs,
            },
            handles: details.handles,
            garbageCollection: {
                gcCount: gc.gcCount,
                gcTime: gc.gcTime,
                gcPauseAverage: gc.gcCount > 0 ? parseFloat((gc.gcTime / gc.gcCount).toFixed(2)) : 0,
                minorGC: gc.minorGC,
                majorGC: gc.majorGC,
                incrementalGC: gc.incrementalGC,
                heapSpaces: gc.heapSpaces,
                gcTotals: gc.gcTotals,
            },
            runtime: details.runtime,
        };
    }
}
