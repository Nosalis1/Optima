import type {
    EventLoopMetrics,
    MemoryMetrics,
    V8RuntimeInfo,
    LibuvHandles,
    HealthData,
    CpuMetrics,
    GCMetrics,
} from "../../domain";
import {
    RingBuffer
} from '../utility';

class HealthStore {
    private cpu: CpuMetrics;
    private memory: MemoryMetrics;
    private eventLoop: EventLoopMetrics;
    private handles: LibuvHandles;
    private garbageCollection: GCMetrics;
    private runtime: V8RuntimeInfo;

    private readonly history: {
        eventLoopLag: RingBuffer<number>;
        usedHeap: RingBuffer<number>;
        totalHeap: RingBuffer<number>;
        rssMemory: RingBuffer<number>;
    };

    constructor(
        bufferSize: number = 60,
        eventLoopLagThreshold: number = 100
    ) {
        this.history = {
            eventLoopLag: new RingBuffer<number>(bufferSize),
            usedHeap: new RingBuffer<number>(bufferSize),
            totalHeap: new RingBuffer<number>(bufferSize),
            rssMemory: new RingBuffer<number>(bufferSize),
        };

        this.cpu = {
            usageRate: 0,
            numberOfCores: 0,
            perCoreUsage: [],
            userUsage: 0,
            systemUsage: 0,
            idleUsage: 0,
        };

        this.memory = {
            heapUsage: 0,
            heapSize: 0,
            rssMemory: 0,
            rssMemoryTotal: 0,
            externalMemory: 0,
        };

        this.eventLoop = {
            lag: 0,
            threshold: eventLoopLagThreshold,
        };

        this.handles = {
            activeHandles: 0,
            activeHandlesTimers: 0,
            activeHandlesSockets: 0,
            activeLibuvHandles: 0,
            timers: 0,
            fileDescriptors: 0,
        };

        this.garbageCollection = {
            gcCount: 0,
            gcTime: 0,
            gcPauseAverage: 0,

            minorGC: {
                runCount: 0,
                averageTime: 0,
            },

            majorGC: {
                runCount: 0,
                averageTime: 0,
            },

            incrementalGC: {
                runCount: 0,
                averageTime: 0,
            },

            heapSpaces: [],

            gcTotals: {
                totalPauseTime: 0,
                freedMemory: 0,
                promotions: 0,
                tenuredSize: 0,
            },
        };

        this.runtime = {
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
            v8Version: process.versions.v8,
            libuvVersion: process.versions.uv,
            openSSLVersion: process.versions.openssl,

            threadPoolSize: 0,
            activeThreads: 0,

            startup: {
                bootstrapTime: 0,
                requiredModules: 0,
            },
        };
    }

    updateCPU(cpu: CpuMetrics) {
        this.cpu = cpu;
    }

    updateMemory(memory: MemoryMetrics) {
        this.memory = memory;
        this.history.usedHeap.push(memory.heapUsage);
        this.history.totalHeap.push(memory.heapSize);
        this.history.rssMemory.push(memory.rssMemory);
    }

    updateEventLoop(eventLoop: EventLoopMetrics) {
        this.eventLoop = eventLoop;
        this.history.eventLoopLag.push(eventLoop.lag);
    }

    updateHandles(handles: LibuvHandles) {
        this.handles = handles;
    }

    updateGC(gc: GCMetrics) {
        this.garbageCollection = gc;
    }

    updateRuntime(runtime: V8RuntimeInfo) {
        this.runtime = runtime;
    }

    get(): HealthData {
        return {
            cpu: this.cpu,
            memory: this.memory,
            eventLoop: this.eventLoop,
            handles: this.handles,
            garbageCollection: this.garbageCollection,
            runtime: this.runtime,
            history: {
                eventLoopLag: this.history.eventLoopLag.values(),
                memoryBreakdown: {
                    usedHeap: this.history.usedHeap.values(),
                    totalHeap: this.history.totalHeap.values(),
                    rssMemory: this.history.rssMemory.values(),
                }
            }
        };
    }

    resetHistory() {
        this.history.eventLoopLag.clear();
        this.history.usedHeap.clear();
        this.history.totalHeap.clear();
        this.history.rssMemory.clear();
    }
}

export { HealthStore };