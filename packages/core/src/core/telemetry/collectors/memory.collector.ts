import os from 'node:os';
import process from 'node:process';
import { ICollector } from './interface';
import { convertBytes } from '../../utility';

type MemoryUsageResult = {
    heapUsage: number;
    heapSize: number;

    rssMemory: number;
    rssMemoryTotal: number;

    externalMemory: number;
}

class MemoryCollector implements ICollector<MemoryUsageResult> {

    public collect() {
        const toMB = (bytes: number) => convertBytes(bytes, 'MB');

        const memoryUsage = process.memoryUsage();
        const totalMemory = os.totalmem();

        return {
            heapUsage: toMB(memoryUsage.heapUsed),
            heapSize: toMB(memoryUsage.heapTotal),

            rssMemory: toMB(memoryUsage.rss),
            rssMemoryTotal: toMB(totalMemory),

            externalMemory: toMB(memoryUsage.external),
        };
    }
}

export { MemoryCollector, MemoryUsageResult };