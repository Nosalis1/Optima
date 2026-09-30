import type { ReadonlyConfig } from "../../config";
import type { HealthData, SystemStaticInfo } from "../domain";
import type { LocalRepository } from "../storage";
import type { MetricBucket } from "../storage/stores/bucket-metric";

export class RuntimeService {
    readonly eventLoopLagThresholdMs: number;
    readonly env: string;
    readonly startedAt: number;
    readonly nodeVersion: string;

    constructor(
        private readonly storage: LocalRepository,
        private readonly config: ReadonlyConfig
    ) {
        this.eventLoopLagThresholdMs = config.publisher.eventLoopLagThresholdMs;
        this.env = process.env.NODE_ENV ?? 'unknown';
        this.nodeVersion = process.version;
        this.startedAt = Date.now();
    }

    private buildCpu({ runtime }: MetricBucket): HealthData['cpu'] {
        const usage = runtime.cpuUsage;
        return {
            usageRate: usage.process.totalPercent,
            numberOfCores: usage.numberOfCores,
            perCoreUsage: usage.system.perCoreUsage,
            userUsage: usage.process.userPercent,
            systemUsage: usage.process.systemPercent,
            idleUsage: usage.system.idlePercent,
        };
    }

    private buildMemory({ runtime }: MetricBucket): HealthData['memory'] {
        const memory = runtime.memoryUsage;
        return {
            heapUsage: memory.heapUsage,
            heapSize: memory.heapSize,
            rssMemory: memory.rssMemory,
            rssMemoryTotal: memory.rssMemoryTotal,
            externalMemory: memory.externalMemory,
        };
    }

    private buildEventLoop({ runtime }: MetricBucket): HealthData['eventLoop'] {
        return {
            lag: runtime.loopDelay.meanMs,
            threshold: this.eventLoopLagThresholdMs,
        };
    }

    private buildHandles({ runtime }: MetricBucket): HealthData['handles'] {
        const handles = runtime.handles;
        return {
            activeHandles: handles.activeHandles,
            activeHandlesTimers: handles.activeHandlesTimers,
            activeHandlesSockets: handles.activeHandlesSockets,
            activeLibuvHandles: handles.activeLibuvHandles,
            timers: handles.timers,
            fileDescriptors: handles.fileDescriptors,
        };
    }

    private buildGC({ runtime }: MetricBucket): HealthData['garbageCollection'] {
        const gc = runtime.gc;
        return {
            gcCount: gc.gcCount,
            gcTime: gc.gcTime,
            gcPauseAverage: gc.gcPauseAverage,
            minorGC: gc.minorGC,
            majorGC: gc.majorGC,
            incrementalGC: gc.incrementalGC,
            heapSpaces: gc.heapSpaces,
            gcTotals: gc.gcTotals,
        };
    }

    private buildRuntime({ runtime }: MetricBucket): HealthData['runtime'] {
        const rt = runtime.runtime;
        return {
            pid: rt.pid,
            platform: rt.platform,
            nodeVersion: rt.nodeVersion,
            v8Version: rt.v8Version,
            libuvVersion: rt.libuvVersion,
            openSSLVersion: rt.openSSLVersion,
            threadPoolSize: rt.threadPoolSize,
            activeThreads: rt.activeThreads,
            startup: rt.startup
        };
    }

    private buildHistory(history: MetricBucket[]): HealthData['history'] {
        return {
            eventLoopLag: history.map(h => h.runtime.loopDelay.meanMs),
            memoryBreakdown: {
                usedHeap: history.map(h => h.runtime.memoryUsage.heapUsage),
                totalHeap: history.map(h => h.runtime.memoryUsage.heapSize),
                rssMemory: history.map(h => h.runtime.memoryUsage.rssMemory),
            }
        };
    }

    getSystemStaticInfo(): SystemStaticInfo {
        return {
            uptime: Date.now() - this.startedAt,
            nodeVersion: this.nodeVersion,
            env: this.env
        };
    }

    get(): HealthData | null {
        const latest = this.storage.bucket.latest();
        if (!latest) return null;
        const history = this.storage.bucket.getHistory();
        return {
            cpu: this.buildCpu(latest),
            memory: this.buildMemory(latest),
            eventLoop: this.buildEventLoop(latest),
            handles: this.buildHandles(latest),
            garbageCollection: this.buildGC(latest),
            runtime: this.buildRuntime(latest),
            history: this.buildHistory(history)
        };
    }
}