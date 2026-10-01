import type { TelemetryRequest } from '../domain';
import type { ReadonlyConfig } from '../../config';

export class TelemetryService {
    private inFlight = 0;
    private drainWaiters: Array<() => void> = [];

    constructor(
        private readonly storage: {
            record(request: TelemetryRequest): void;
        },
        private readonly config: ReadonlyConfig
    ) { }

    private isPathExcluded(endpoint: string): boolean {
        const cleanPath = endpoint.split('?')[0];
        const userConfig = this.config;

        const configuredPaths = userConfig?.excludePaths || [];
        const allPatterns = [...configuredPaths];

        return allPatterns.some(pattern => {
            const cleanPattern = pattern.replace(/\*/g, '');
            return cleanPath.includes(cleanPattern);
        });
    }

    track(): () => void {
        this.inFlight++;
        let done = false;
        return () => {
            if (done) return;
            done = true;
            this.inFlight--;
            if (this.inFlight === 0) {
                const waiters = this.drainWaiters;
                this.drainWaiters = [];
                for (const w of waiters) w();
            }
        };
    }

    get inFlightCount(): number { return this.inFlight; }

    whenDrained(timeoutMs: number): Promise<boolean> {
        if (this.inFlight === 0) return Promise.resolve(true);
        return new Promise<boolean>(resolve => {
            const timer = setTimeout(() => {
                this.drainWaiters = this.drainWaiters.filter(w => w !== onDrain);
                resolve(false);
            }, timeoutMs);
            timer.unref();
            const onDrain = () => { clearTimeout(timer); resolve(true); };
            this.drainWaiters.push(onDrain);
        });
    }

    record(
        data: Omit<TelemetryRequest, 'timestamp' | 'responseTime'>,
        startHrTime: bigint,
    ): TelemetryRequest | null {
        if (this.isPathExcluded(data.endpoint)) {
            return null;
        }

        const endHrTime = process.hrtime.bigint();

        const durationInMS = Number(endHrTime - startHrTime) / 1e6;
        const durationInMSFixed = parseFloat(durationInMS.toFixed(2));

        const telemetryRequest: TelemetryRequest = {
            ...data,
            timestamp: Date.now(),
            responseTime: durationInMSFixed,
        };

        this.storage.record(telemetryRequest);
        return telemetryRequest;
    }
}