import { ICollector } from './interface';

type HandleUsageResult = {
    activeHandles: number;
    activeHandlesTimers: number;
    activeHandlesSockets: number;
    activeLibuvHandles: number;
    timers: number;
    fileDescriptors: number;
}

class HandlesCollector implements ICollector<HandleUsageResult> {
    public collect() {
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
};

export { HandlesCollector, HandleUsageResult };