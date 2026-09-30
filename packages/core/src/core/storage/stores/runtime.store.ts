import {
    monitorEventLoopDelay,
    PerformanceObserver,
    type IntervalHistogram
} from 'node:perf_hooks';
import v8 from "v8";
import os from 'node:os';
import type { RuntimeInterval } from './bucket-metric';
import { toPercentage, clamp, convertBytes } from '../../utility';
import type { ReadonlyConfig } from '../../../config';

export class RuntimeStore {
    private readonly loopDelay: IntervalHistogram;
    private gcObserver: PerformanceObserver | null = null;

    private lastCpuSample: NodeJS.CpuUsage = process.cpuUsage();
    private lastTimeSample: bigint = process.hrtime.bigint();

    constructor(
        readonly config: ReadonlyConfig
    ) {
        this.loopDelay = monitorEventLoopDelay({ resolution: config.publisher.eventLoopResolutionMs });
        this.loopDelay.enable();
        try {
            this.gcObserver = new PerformanceObserver(list => {
                for (const e of list.getEntries()) {
                    this.gcStats.gcCount++;
                    this.gcStats.gcTime += e.duration;

                    const detail = (e as any).detail;
                    const kind = detail ? detail.kind : 0;

                    if (kind === 1) { // Minor GC
                        this.gcStats.minorGC.runCount++;
                        this.gcStats.minorGC.totalTime += e.duration;
                    } else if (kind === 2) { // Major GC
                        this.gcStats.majorGC.runCount++;
                        this.gcStats.majorGC.totalTime += e.duration;
                    } else { // Incremental GC
                        this.gcStats.incrementalGC.runCount++;
                        this.gcStats.incrementalGC.totalTime += e.duration;
                    }

                    if (detail) {
                        if (detail.freedMemory) this.gcStats.freedMemory += detail.freedMemory;
                    }
                }
                this.gcObserver?.observe({ entryTypes: ['gc'], buffered: true });
            });
        } catch { this.gcObserver = null; }
    }

    //#region CPU

    private collectCPUUsage(): RuntimeInterval['cpuUsage'] {
        try {
            const currentCpuUsage = process.cpuUsage(this.lastCpuSample);
            const currentTime = process.hrtime.bigint();

            const elapsedTimeUs = Number(currentTime - this.lastTimeSample) / 1000;

            this.lastCpuSample = process.cpuUsage();
            this.lastTimeSample = currentTime;

            const userPercent = toPercentage(currentCpuUsage.user, elapsedTimeUs);
            const systemPercent = toPercentage(currentCpuUsage.system, elapsedTimeUs);

            const totalPercent = clamp(userPercent + systemPercent, 0, 100);

            const cpus = os.cpus();

            const perCoreUsage = cpus.map((core) => {
                const total = Object.values(core.times).reduce((sum, value) => sum + value, 0);
                return total > 0 ? toPercentage(total - core.times.idle, total) : 0;
            });

            return {
                numberOfCores: cpus.length,
                process: {
                    userPercent,
                    systemPercent,
                    totalPercent
                },
                system: {
                    idlePercent: Math.max(0, 100 - totalPercent),
                    perCoreUsage
                }
            }
        } catch {
            return {
                numberOfCores: 0,
                process: { userPercent: 0, systemPercent: 0, totalPercent: 0 },
                system: { idlePercent: 0, perCoreUsage: [] }
            }
        }
    }

    //#endregion

    //#region Memory

    private collectMemoryUsage(): RuntimeInterval['memoryUsage'] {
        try {
            const memory = process.memoryUsage();
            const heapStatistics = v8.getHeapStatistics();
            const totalMemory = os.totalmem();

            const toMB = (bytes: number) => bytes / (1024 * 1024);

            return {
                heapUsage: toMB(memory.heapUsed),
                heapSize: toMB(memory.heapTotal),
                heapLimit: toMB(heapStatistics.heap_size_limit),
                rssMemory: toMB(memory.rss),
                rssMemoryTotal: toMB(totalMemory),
                externalMemory: toMB(memory.external),
                arrayBuffers: toMB(memory.arrayBuffers)
            }

        } catch {
            return { heapUsage: 0, heapSize: 0, heapLimit: 0, rssMemory: 0, rssMemoryTotal: 0, externalMemory: 0, arrayBuffers: 0 }
        }
    }

    //#endregion

    //#region Loop Delay

    private collectLoopDelay(): RuntimeInterval['loopDelay'] {
        try {
            const toMs = (ns: number) => ns / 1e6;
            const result: RuntimeInterval['loopDelay'] = {
                minMs: toMs(this.loopDelay.min),
                maxMs: toMs(this.loopDelay.max),
                meanMs: toMs(this.loopDelay.mean),
                p50Ms: toMs(this.loopDelay.percentile(50)),
                p99Ms: toMs(this.loopDelay.percentile(99))
            };
            this.loopDelay.reset();
            return result;
        } catch {
            return { minMs: 0, maxMs: 0, meanMs: 0, p50Ms: 0, p99Ms: 0 };
        }
    }

    //#endregion

    //#region GC

    private gcStats = {
        gcCount: 0,
        gcTime: 0,
        gcPauseAverage: 0,
        minorGC: { runCount: 0, totalTime: 0 },
        majorGC: { runCount: 0, totalTime: 0 },
        incrementalGC: { runCount: 0, totalTime: 0 },
        freedMemory: 0
    };

    private collectGC(): RuntimeInterval['gc'] {
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

    //#endregion

    //#region Handles

    private collectHandles(): RuntimeInterval['handles'] {
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

    //#endregion

    //#region Runtime

    private collectRuntime(): RuntimeInterval['runtime'] {
        const threadPoolSize = process.env.UV_THREADPOOL_SIZE ? parseInt(process.env.UV_THREADPOOL_SIZE) : 4;
        const activeThreads = (process as any)._getActiveRequests().length ?? 0;

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

    //#endregion

    collect(): RuntimeInterval {
        const cpuUsage = this.collectCPUUsage();
        const memoryUsage = this.collectMemoryUsage();
        const loopDelay = this.collectLoopDelay();
        const gc = this.collectGC();
        const handles = this.collectHandles();
        const runtime = this.collectRuntime();

        return { cpuUsage, memoryUsage, loopDelay, gc, handles, runtime };
    }

    dispose(): void {
        this.loopDelay.disable();
        this.gcObserver?.disconnect();
    }
}
