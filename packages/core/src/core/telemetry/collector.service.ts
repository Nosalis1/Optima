import {
    type SystemStaticInfo,
    type AnalyticsData,
    type HealthDetails,
    type AnalyticsFilterSettings,

    type BucketsMessage,
    type BucketsRequest
} from '../domain';
import type { LocalRepository } from "../storage";
import { DEFAULT_CONFIG, type ReadonlyConfig } from '../../config';
import type { DashboardService } from './dashboard.service';
import type { AnalyticsService } from './analytics.service';
import type { RuntimeService } from './runtime.service';

export class CollectorService {
    private readonly analyticsPageSize: number;

    constructor(
        private readonly storage: LocalRepository,
        private readonly dashboardService: DashboardService,
        private readonly analyticsService: AnalyticsService,
        private readonly runtimeService: RuntimeService,
        config: ReadonlyConfig,
    ) {
        this.analyticsPageSize = (config.dashboard === false ? DEFAULT_CONFIG.dashboard : config.dashboard).analyticsPageSize;
    }

    getSystemStaticInfo(): SystemStaticInfo {
        return this.runtimeService.getSystemStaticInfo();
    }

    getAnalyticsData(filters?: AnalyticsFilterSettings): AnalyticsData {
        return this.analyticsService.get(filters?.page || 1, this.analyticsPageSize, filters);
    }

    getHealthData(): HealthDetails {
        return this.runtimeService.get();
    }

    getLiveBuckets(): BucketsMessage | null {
        return this.dashboardService.getLive();
    }

    getBackFill(req: BucketsRequest): Promise<BucketsMessage> {
        return this.dashboardService.getBackFill(req);
    }

    tick() { this.storage.tick(); }
}