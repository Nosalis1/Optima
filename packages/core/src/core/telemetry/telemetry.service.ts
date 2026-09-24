import type { TelemetryRequest } from '../domain';
import type { ReadonlyConfig } from '../../config';

export class TelemetryService {
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