import os from 'node:os';
import process from 'node:process';
import { ICollector } from './interface';
import { toPercentage, clamp } from '../../utility';

type CPUUsageResult = {
    numberOfCores: number;
    userPercent: number;
    systemPercent: number;
    totalPercent: number;
    idlePercent: number;
    perCoreUsage: number[];
}

class CPUCollector implements ICollector<CPUUsageResult> {
    private lastCpuSample: NodeJS.CpuUsage = process.cpuUsage();
    private lastTimeSample: bigint = process.hrtime.bigint();

    public collect() {
        const currentCpuUsage = process.cpuUsage(this.lastCpuSample);
        const currentSampleTime = process.hrtime.bigint();

        const elapsedTimeInNs = currentSampleTime - this.lastTimeSample;
        const elapsedTimeInMicros = Number(elapsedTimeInNs) / 1000;

        this.lastCpuSample = process.cpuUsage();
        this.lastTimeSample = currentSampleTime;

        const userPercent = toPercentage(currentCpuUsage.user, elapsedTimeInMicros);
        const systemPercent = toPercentage(currentCpuUsage.system, elapsedTimeInMicros);
        const idlePercent = Math.max(0, 100 - (userPercent + systemPercent));

        const cpus = os.cpus();
        const perCoreUsage = cpus.map((core, index) => {
            const coreTotalTime = Object.values(core.times).reduce((a, b) => a + b, 0);
            return coreTotalTime > 0 ? toPercentage((coreTotalTime - core.times.idle), coreTotalTime) : 0;
        });

        return {
            numberOfCores: cpus.length,
            userPercent: userPercent,
            systemPercent: systemPercent,
            totalPercent: clamp(userPercent + systemPercent, 0, 100),
            idlePercent: idlePercent,
            perCoreUsage: perCoreUsage,
        };
    };
}

export { CPUCollector, CPUUsageResult };