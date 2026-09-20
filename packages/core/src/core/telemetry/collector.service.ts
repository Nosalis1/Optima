import type {
    SystemStaticInfo,
    AnalyticsData,
    DashboardData,
    HealthData,
    AnalyticsFilterSettings,
} from '../domain';
import { storage } from "../storage";
import {
    CPUCollector,
    MemoryCollector,
    EventLoopCollector,
    GCCollector,
    HandlesCollector,
    RuntimeCollector
} from './collectors';
import { getConfig } from '../../config';

class CollectorService {
    constructor(
        private readonly cpuCollector: CPUCollector,
        private readonly memoryCollector: MemoryCollector,
        private readonly eventLoopCollector: EventLoopCollector,
        private readonly gcCollector: GCCollector,
        private readonly handlesCollector: HandlesCollector,
        private readonly runtimeCollector: RuntimeCollector,
    ) { }

    getSystemStaticInfo(): SystemStaticInfo {
        return storage.system.get();
    }

    getDashboardData(): DashboardData {
        return storage.dashboard.get();
    }

    getAnalyticsData(filters?: AnalyticsFilterSettings): AnalyticsData {
        return storage.analytics.get(filters?.page || 1, 5, filters);
    }

    getHealthData(): HealthData {
        return storage.health.get();
    }

    tick() {
        const cpuData = this.cpuCollector.collect();
        storage.health.updateCPU({
            usageRate: cpuData.totalPercent,
            numberOfCores: cpuData.numberOfCores,
            perCoreUsage: cpuData.perCoreUsage,
            userUsage: cpuData.userPercent,
            systemUsage: cpuData.systemPercent,
            idleUsage: cpuData.idlePercent
        });

        const memoryData = this.memoryCollector.collect();
        storage.health.updateMemory({
            heapUsage: memoryData.heapUsage,
            heapSize: memoryData.heapSize,

            rssMemory: memoryData.rssMemory,
            rssMemoryTotal: memoryData.rssMemoryTotal,

            externalMemory: memoryData.externalMemory,
        });

        const eventLoopData = this.eventLoopCollector.collect();
        storage.health.updateEventLoop({
            lag: eventLoopData.meanMs,
            threshold: this.eventLoopCollector.thresholdMs,
        });

        const handlesData = this.handlesCollector.collect();
        storage.health.updateHandles({
            activeHandles: handlesData.activeHandles,
            activeHandlesTimers: handlesData.activeHandlesTimers,
            activeHandlesSockets: handlesData.activeHandlesSockets,
            activeLibuvHandles: handlesData.activeLibuvHandles,
            timers: handlesData.timers,
            fileDescriptors: handlesData.fileDescriptors
        });

        const gcData = this.gcCollector.collect();
        storage.health.updateGC({
            gcCount: gcData.gcCount,
            gcTime: gcData.gcTime,
            gcPauseAverage: gcData.gcPauseAverage,
            minorGC: gcData.minorGC,
            majorGC: gcData.majorGC,
            incrementalGC: gcData.incrementalGC,
            heapSpaces: gcData.heapSpaces,
            gcTotals: gcData.gcTotals
        });

        const runtimeData = this.runtimeCollector.collect();
        storage.health.updateRuntime({
            pid: runtimeData.pid,
            platform: runtimeData.platform,
            nodeVersion: runtimeData.nodeVersion,
            v8Version: runtimeData.v8Version,
            libuvVersion: runtimeData.libuvVersion,
            openSSLVersion: runtimeData.openSSLVersion,
            threadPoolSize: runtimeData.threadPoolSize,
            activeThreads: runtimeData.activeThreads,
            startup: runtimeData.startup
        });

        storage.tick();
    }
}

export const collectorService = new CollectorService(
    new CPUCollector(),
    new MemoryCollector(),
    new EventLoopCollector(
        getConfig().publisher.eventLoopResolutionMs,
        getConfig().publisher.eventLoopLagThresholdMs
    ),
    new GCCollector(),
    new HandlesCollector(),
    new RuntimeCollector(),
);