import {
    monitorEventLoopDelay,
    PerformanceObserver,
    type IntervalHistogram
} from 'node:perf_hooks';
import v8 from "v8";
import os from 'node:os';
import type { RuntimeInterval } from './bucket-metric';
import { toPercentage, convertBytes } from '../../utility';
import type { ReadonlyConfig } from '../../../config';

type GCKindTotals = { runCount: number; totalTime: number; };

export interface RuntimeDetails {
    numberOfCores: number;
    perCoreUsage: number[];
    rssMemoryTotal: number;
    externalMemory: number;
    arrayBuffers: number;
    gc: {
        gcCount: number;
        gcTime: number;
        minorGC: { runCount: number; averageTime: number; };
        majorGC: { runCount: number; averageTime: number; };
        incrementalGC: { runCount: number; averageTime: number; };
        heapSpaces: { label: string; used: number; }[];
        gcTotals: { totalPauseTime: number; freedMemory: number; promotions: number; tenuredSize: number; };
    };
    handles: {
        activeHandles: number;
        activeHandlesTimers: number;
        activeHandlesSockets: number;
        activeLibuvHandles: number;
        timers: number;
        fileDescriptors: number;
    };
    runtime: {
        pid: number;
        platform: NodeJS.Platform;
        nodeVersion: string;
        v8Version: string;
        libuvVersion: string;
        openSSLVersion: string;
        threadPoolSize: number;
        activeThreads: number;
        startup: { bootstrapTime: number; requiredModules: number; };
    };
}

export class RuntimeStore {
    private readonly loopDelay: IntervalHistogram;
    private gcObserver: PerformanceObserver | null = null;
    private disposed = false;

    private lastCpu: NodeJS.CpuUsage = process.cpuUsage();
    private intervalGcCount = 0;
    private intervalGcDurationMs = 0;

    private readonly gcTotals = {
        gcCount: 0,
        gcTime: 0,
        minorGC: { runCount: 0, totalTime: 0 } as GCKindTotals,
        majorGC: { runCount: 0, totalTime: 0 } as GCKindTotals,
        incrementalGC: { runCount: 0, totalTime: 0 } as GCKindTotals,
        freedMemory: 0
    };
    private lastCoreTimes: os.CpuInfo['times'][] = os.cpus().map(c => ({ ...c.times }));

    constructor(
        readonly config: ReadonlyConfig
    ) {
        this.loopDelay = monitorEventLoopDelay({ resolution: config.publisher.eventLoopResolutionMs });
        this.loopDelay.enable();
        try {
            this.gcObserver = new PerformanceObserver(list => {
                for (const e of list.getEntries()) this.recordGC(e);
            });
            this.gcObserver.observe({ entryTypes: ['gc'] });
        } catch { this.gcObserver = null; }
    }

    private recordGC(e: PerformanceEntry): void {
        this.intervalGcCount++;
        this.intervalGcDurationMs += e.duration;

        this.gcTotals.gcCount++;
        this.gcTotals.gcTime += e.duration;

        const detail = (e as any).detail;
        const kind = detail ? detail.kind : 0;
        const bucket = kind === 1 ? this.gcTotals.minorGC
            : kind === 2 ? this.gcTotals.majorGC
                : this.gcTotals.incrementalGC;
        bucket.runCount++;
        bucket.totalTime += e.duration;

        if (detail?.freedMemory) this.gcTotals.freedMemory += detail.freedMemory;
    }

    closeInterval(): RuntimeInterval {
        let cpuUserUs: number | null = null;
        let cpuSystemUs: number | null = null;
        try {
            const now = process.cpuUsage();
            cpuUserUs = now.user - this.lastCpu.user;
            cpuSystemUs = now.system - this.lastCpu.system;
            this.lastCpu = now;
        } catch { }

        let heapUsedBytes: number | null = null;
        let heapTotalBytes: number | null = null;
        let heapLimitBytes: number | null = null;
        let rssBytes: number | null = null;
        try {
            const memory = process.memoryUsage();
            heapUsedBytes = memory.heapUsed;
            heapTotalBytes = memory.heapTotal;
            rssBytes = memory.rss;
            heapLimitBytes = v8.getHeapStatistics().heap_size_limit;
        } catch { }

        let eventLoopSampleCount = 0;
        let eventLoopDelaySumMs: number | null = null;
        let eventLoopDelayMaxMs: number | null = null;
        if (!this.disposed) {
            try {
                eventLoopSampleCount = this.loopDelay.count;
                if (eventLoopSampleCount > 0) {
                    eventLoopDelaySumMs = (this.loopDelay.mean * eventLoopSampleCount) / 1e6;
                    eventLoopDelayMaxMs = this.loopDelay.max / 1e6;
                }
            } catch { eventLoopSampleCount = 0; }
            this.loopDelay.reset();
        }

        const gcCount = this.gcObserver ? this.intervalGcCount : null;
        const gcDurationSumMs = this.gcObserver ? this.intervalGcDurationMs : null;
        this.intervalGcCount = 0;
        this.intervalGcDurationMs = 0;

        return {
            cpuTimeUs: cpuUserUs !== null && cpuSystemUs !== null ? cpuUserUs + cpuSystemUs : null,
            cpuUserUs,
            cpuSystemUs,
            heapUsedBytes,
            heapTotalBytes,
            heapLimitBytes,
            rssBytes,
            eventLoopSampleCount,
            eventLoopDelaySumMs,
            eventLoopDelayMaxMs,
            gcCount,
            gcDurationSumMs,
        };
    }


    private collectPerCore(): { numberOfCores: number; perCoreUsage: number[] } {
        try {
            const cpus = os.cpus();
            const perCoreUsage = cpus.map((core, i) => {
                const prev = this.lastCoreTimes[i];
                const cur = core.times;
                const total = (t: os.CpuInfo['times']) => t.user + t.nice + t.sys + t.idle + t.irq;
                const dTotal = prev ? total(cur) - total(prev) : total(cur);
                const dIdle = prev ? cur.idle - prev.idle : cur.idle;
                return dTotal > 0 ? toPercentage(dTotal - dIdle, dTotal) : 0;
            });
            this.lastCoreTimes = cpus.map(c => ({ ...c.times }));
            return { numberOfCores: cpus.length, perCoreUsage };
        } catch {
            return { numberOfCores: 0, perCoreUsage: [] };
        }
    }

    private collectGCDetails(): RuntimeDetails['gc'] {
        const t = this.gcTotals;
        const avg = (k: GCKindTotals) => k.runCount > 0 ? parseFloat((k.totalTime / k.runCount).toFixed(2)) : 0;

        let heapSpaces: RuntimeDetails['gc']['heapSpaces'] = [];
        let tenuredSize = 0;
        try {
            const spaceStats = v8.getHeapSpaceStatistics();
            heapSpaces = spaceStats.map(space => ({ label: space.space_name, used: space.space_used_size / 1024 / 1024 }));
            const old = spaceStats.find(s => s.space_name === 'old_space');
            tenuredSize = old ? old.space_used_size / 1024 / 1024 : 0;
        } catch { }

        return {
            gcCount: t.gcCount,
            gcTime: parseFloat(t.gcTime.toFixed(2)),
            minorGC: { runCount: t.minorGC.runCount, averageTime: avg(t.minorGC) },
            majorGC: { runCount: t.majorGC.runCount, averageTime: avg(t.majorGC) },
            incrementalGC: { runCount: t.incrementalGC.runCount, averageTime: avg(t.incrementalGC) },
            heapSpaces,
            gcTotals: {
                totalPauseTime: parseFloat(t.gcTime.toFixed(2)),
                freedMemory: convertBytes(t.freedMemory, 'MB'),
                promotions: t.majorGC.runCount,
                tenuredSize
            }
        };
    }

    private collectHandles(): RuntimeDetails['handles'] {
        const handles = (process as any)._getActiveHandles ? (process as any)._getActiveHandles() : [];

        let timers = 0;
        let sockets = 0;

        for (const h of handles) {
            if (h.constructor && h.constructor.name === 'Timeout') timers++;
            if (h.constructor && (h.constructor.name === 'Socket' || h.constructor.name === 'TCPSocket')) sockets++;
        }

        return {
            activeHandles: handles.length,
            activeHandlesTimers: timers,
            activeHandlesSockets: sockets,
            activeLibuvHandles: handles.length,
            timers,
            fileDescriptors: handles.length
        };
    }

    private collectRuntime(): RuntimeDetails['runtime'] {
        const threadPoolSize = process.env.UV_THREADPOOL_SIZE ? parseInt(process.env.UV_THREADPOOL_SIZE) : 4;
        const activeThreads = (process as any)._getActiveRequests?.().length ?? 0;

        return {
            pid: process.pid,
            platform: process.platform,
            nodeVersion: process.version,
            v8Version: process.versions.v8,
            libuvVersion: process.versions.uv,
            openSSLVersion: process.versions.openssl,
            threadPoolSize: threadPoolSize,
            activeThreads: activeThreads,
            startup: {
                bootstrapTime: performance.now(),
                requiredModules: Object.keys(require.cache).length,
            }
        };
    }

    details(): RuntimeDetails {
        let memory: Pick<RuntimeDetails, 'rssMemoryTotal' | 'externalMemory' | 'arrayBuffers'>;
        try {
            const m = process.memoryUsage();
            memory = { rssMemoryTotal: os.totalmem(), externalMemory: m.external, arrayBuffers: m.arrayBuffers };
        } catch {
            memory = { rssMemoryTotal: 0, externalMemory: 0, arrayBuffers: 0 };
        }
        return {
            ...this.collectPerCore(),
            ...memory,
            gc: this.collectGCDetails(),
            handles: this.collectHandles(),
            runtime: this.collectRuntime(),
        };
    }


    dispose(): void {
        if (this.disposed) return;
        this.disposed = true;
        this.loopDelay.disable();
        this.gcObserver?.disconnect();
    }
}
