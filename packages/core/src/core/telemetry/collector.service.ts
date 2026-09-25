import type {
    SystemStaticInfo,
    AnalyticsData,
    DashboardData,
    HealthData,
    AnalyticsFilterSettings,
    DashboardTickData,
} from '../domain';
import type { LocalRepository } from "../storage";
import type { ReadonlyConfig } from '../../config';
import {
    CPUCollector,
    MemoryCollector,
    EventLoopCollector,
    GCCollector,
    HandlesCollector,
    RuntimeCollector
} from './collectors';

export class CollectorService {
    private readonly cpuCollector: CPUCollector;
    private readonly memoryCollector: MemoryCollector;
    private readonly eventLoopCollector: EventLoopCollector;
    private readonly gcCollector: GCCollector;
    private readonly handlesCollector: HandlesCollector;
    private readonly runtimeCollector: RuntimeCollector;

    constructor(
        private readonly storage: LocalRepository,
        private readonly config: ReadonlyConfig,
    ) {
        this.cpuCollector = new CPUCollector();
        this.memoryCollector = new MemoryCollector();
        this.eventLoopCollector = new EventLoopCollector(
            this.config.publisher.eventLoopResolutionMs,
            this.config.publisher.eventLoopLagThresholdMs
        );
        this.gcCollector = new GCCollector();
        this.handlesCollector = new HandlesCollector();
        this.runtimeCollector = new RuntimeCollector();
    }

    getSystemStaticInfo(): SystemStaticInfo {
        return this.storage.system.get();
    }

    getDashboardData(): DashboardData {
        return this.storage.dashboard.get();
    }

    getDashboardTickData(): DashboardTickData {
        return this.storage.dashboard.getTickData();
    }

    getAnalyticsData(filters?: AnalyticsFilterSettings): AnalyticsData {
        return this.storage.analytics.get(filters?.page || 1, 5, filters);
    }

    getHealthData(): HealthData {
        return this.storage.health.get();
    }

    tick() {
        const cpuData = this.cpuCollector.collect();
        this.storage.health.updateCPU({
            usageRate: cpuData.totalPercent,
            numberOfCores: cpuData.numberOfCores,
            perCoreUsage: cpuData.perCoreUsage,
            userUsage: cpuData.userPercent,
            systemUsage: cpuData.systemPercent,
            idleUsage: cpuData.idlePercent
        });

        const memoryData = this.memoryCollector.collect();
        this.storage.health.updateMemory({
            heapUsage: memoryData.heapUsage,
            heapSize: memoryData.heapSize,

            rssMemory: memoryData.rssMemory,
            rssMemoryTotal: memoryData.rssMemoryTotal,

            externalMemory: memoryData.externalMemory,
        });

        const eventLoopData = this.eventLoopCollector.collect();
        this.storage.health.updateEventLoop({
            lag: eventLoopData.meanMs,
            threshold: this.eventLoopCollector.thresholdMs,
        });

        const handlesData = this.handlesCollector.collect();
        this.storage.health.updateHandles({
            activeHandles: handlesData.activeHandles,
            activeHandlesTimers: handlesData.activeHandlesTimers,
            activeHandlesSockets: handlesData.activeHandlesSockets,
            activeLibuvHandles: handlesData.activeLibuvHandles,
            timers: handlesData.timers,
            fileDescriptors: handlesData.fileDescriptors
        });

        const gcData = this.gcCollector.collect();
        this.storage.health.updateGC({
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
        this.storage.health.updateRuntime({
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

        this.storage.tick();
    }
}