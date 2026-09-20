import { PersistenceLayer } from '../storage/persistence.layer';
import { ApplicationEvent } from '../domain';
import Logger from '../telemetry/logger';

type AppPartialEvent = Omit<ApplicationEvent, 'timestamp' | 'applicationVersion'>;
type AsyncListener = (event: ApplicationEvent) => void | Promise<void>;
type ApplicationEventManagerInstance = Omit<ApplicationEventManager, 'start' | 'stop'>;

export class ApplicationEventManager {
    static instance: ApplicationEventManagerInstance | null = null;
    private listeners: Array<AsyncListener> = [];

    constructor(
        private persistence: PersistenceLayer,
        private applicationVersion: string = ''
    ) {
        if (ApplicationEventManager.instance) {
            throw new Error('ApplicationEventManager is a singleton class. Use ApplicationEventManager.getInstance() to access the instance.');
        }
        ApplicationEventManager.instance = this;
    }

    start() {
        this.on((event) => this.persistence.onApplicationEvent(event));
        this.on(async (event) => {
            if (event.type === 'SHUTDOWN') {
                await this.persistence.shutdown();
            }
        });
    }

    stop() {
        for (const listener of this.listeners) {
            this.off(listener);
        }
        this.listeners = [];
    }

    on(listener: AsyncListener) {
        this.listeners.push(listener);
    }

    off(listener: AsyncListener) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    async emit(event: AppPartialEvent): Promise<void> {
        const fullEvent: ApplicationEvent = {
            timestamp: new Date().toISOString(),
            type: event.type,
            applicationVersion: this.applicationVersion,
            reason: event.reason || '',
        };
        // Using Promise.allSettled to ensure all listeners are called, even if some fail
        // But this is causing strange race conditions, so we will call them sequentially for now
        // const results = await Promise.allSettled(
        //     this.listeners.map(listener => Promise.resolve(listener(fullEvent)))
        // );
        // for (const result of results) {
        //     if (result.status === 'rejected') {
        //         Logger.error('Error in event listener:', result.reason);
        //     }
        // }
        for (const listener of this.listeners) {
            try {
                await listener(fullEvent);
            } catch (error) {
                Logger.error('Error in event listener:', error);
            }
        }
    }
}
