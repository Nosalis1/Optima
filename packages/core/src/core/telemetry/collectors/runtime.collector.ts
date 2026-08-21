import process from 'node:process';
import { ICollector } from './interface';

type RuntimeUsageResult = {
    pid: number;
    platform: NodeJS.Platform;
    nodeVersion: string;
    v8Version: string;
    libuvVersion: string;
    openSSLVersion: string;
    threadPoolSize: number;
    activeThreads: number;
    startup: {
        bootstrapTime: number;
        requiredModules: number;
    }
}

class RuntimeCollector implements ICollector<RuntimeUsageResult> {
    public collect() {

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
};

export { RuntimeCollector, RuntimeUsageResult };