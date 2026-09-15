import { PersistenceLayer } from '../storage/persistence.layer';
import { ApplicationEvent } from '../domain';
import Logger from '../telemetry/logger';

type AppPartialEvent = Omit<ApplicationEvent, 'timestamp' | 'applicationVersion'>;

export class ApplicationEventManager {
    static instance: Omit<ApplicationEventManager, 'start' | 'stop'> | null = null;
    private listeners: Array<(event: ApplicationEvent) => void> = [];

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
        this.on((event) => {
            if (event.type === 'SHUTDOWN') {
                this.persistence.shutdown().catch(err => {
                    Logger.error('Error during persistence shutdown', err);
                });
            }
        });
    }

    stop() {
        for (const listener of this.listeners) {
            this.off(listener);
        }
        this.listeners = [];
    }

    on(listener: (event: ApplicationEvent) => void) {
        this.listeners.push(listener);
    }

    off(listener: (event: ApplicationEvent) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    emit(event: AppPartialEvent) {
        const fullEvent: ApplicationEvent = {
            timestamp: new Date().toISOString(),
            type: event.type,
            applicationVersion: this.applicationVersion,
            reason: event.reason || '',
        };
        for (const listener of this.listeners) {
            listener(fullEvent);
        }
    }
}
