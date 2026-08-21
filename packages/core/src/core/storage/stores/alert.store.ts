import type {
    SeverityLevel,
    AlertMessage,
} from '../../domain';
import {
    RingBuffer
} from '../utility';

interface IntrenalAlert extends AlertMessage {
    id: string;
}

const SEVERITY_PRIORITY: Record<SeverityLevel, number> = {
    info: 0,
    advisory: 1,
    warning: 2,
    critical: 3,
};

class AlertStore {
    private readonly alerts: RingBuffer<IntrenalAlert>;

    constructor(
        bufferSize: number = 100
    ) {
        this.alerts =
            new RingBuffer<IntrenalAlert>(bufferSize);
    }


    add(alert: AlertMessage): void {
        this.alerts.push({
            ...alert,
            id: crypto.randomUUID(),
        });
    }

    critical(title: string): void {
        this.add({
            title,
            timestamp: new Date().toISOString(),
            severity: "critical",
        });
    }

    warning(title: string): void {
        this.add({
            title,
            timestamp: new Date().toISOString(),
            severity: "warning",
        });
    }

    info(title: string): void {
        this.add({
            title,
            timestamp: new Date().toISOString(),
            severity: "info",
        });
    }

    get(count?: number): AlertMessage[] {
        return this.alerts
            .values()
            .sort(
                (a, b) =>
                    SEVERITY_PRIORITY[b.severity] -
                    SEVERITY_PRIORITY[a.severity]
            )
            .slice(0, count === undefined ? undefined : count)
            .map(alert => ({
                title: alert.title,
                timestamp: alert.timestamp,
                severity: alert.severity,
            }));
    }

    latest(): AlertMessage | undefined {
        const alert = this.alerts.latest();
        if (!alert) {
            return undefined;
        }
        return {
            title: alert.title,
            timestamp: alert.timestamp,
            severity: alert.severity,
        };
    }

    clear(): void {
        this.alerts.clear();
    }
}

export { AlertStore };