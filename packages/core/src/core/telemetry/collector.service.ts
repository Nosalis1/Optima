import {
    type SystemStaticInfo,
    type AnalyticsData,
    type DashboardData,
    type HealthData,
    type AnalyticsFilterSettings,
    type DashboardTickData,
    emptyDashboardData,
    emptyDashboardTickData,
    emptyHealthData
} from '../domain';
import type { LocalRepository } from "../storage";
import type { ReadonlyConfig } from '../../config';
import type { DashboardService } from './dashboard.service';
import type { AnalyticsService } from './analytics.service';
import type { RuntimeService } from './runtime.service';

export class CollectorService {

    constructor(
        private readonly storage: LocalRepository,
        private readonly dashboardService: DashboardService,
        private readonly analyticsService: AnalyticsService,
        private readonly runtimeService: RuntimeService,
        private readonly config: ReadonlyConfig,
    ) { }

    getSystemStaticInfo(): SystemStaticInfo {
        return this.runtimeService.getSystemStaticInfo();
    }

    getDashboardData(): DashboardData {
        const data = this.dashboardService.getDashboardData();
        if (!data) return emptyDashboardData();
        return data;
    }

    getDashboardTickData(): DashboardTickData {
        const data = this.dashboardService.getDashboardLatest();
        if (!data) return emptyDashboardTickData();
        return data;
    }

    getAnalyticsData(filters?: AnalyticsFilterSettings): AnalyticsData {
        return this.analyticsService.get(filters?.page || 1, 5, filters);
    }

    getHealthData(): HealthData {
        const data = this.runtimeService.get();
        if (!data) return emptyHealthData();
        return data;
    }

    tick() { this.storage.tick(); }
}