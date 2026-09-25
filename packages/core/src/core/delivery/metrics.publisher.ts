import type {
    WebSocketAdapter
} from "../../adapters/websocket.adapter";
import type {
    SystemStaticInfo,
    AnalyticsData,
    DashboardData,
    DashboardTickData,
    HealthData,
    SessionMetadata,
    SessionManifest,
    SessionSummary,
    AnalyticsFilterSettings,
} from "../domain";
import {
    WebSocketEvents
} from "./websocket.events";

export interface MetricsDataProvider {
    getSystemStaticInfo(): SystemStaticInfo;
    getDashboardData(): DashboardData;
    getDashboardTickData(): DashboardTickData;
    getAnalyticsData(filters?: AnalyticsFilterSettings): AnalyticsData;
    getHealthData(): HealthData;
}

export interface SessionDataProvider {
    getSessionMetadata(): SessionMetadata | null;
    getSessionManifest(): Promise<SessionManifest>;
    getSessionSummary(sessionNumber: number): Promise<SessionSummary | null>;
}

type MetricsPublishedData = {
    systemStaticInfo: SystemStaticInfo;
    dashboardData: DashboardData;
    dashboardTickData: DashboardTickData;
    analyticsData: AnalyticsData;
    healthData: HealthData;
} | null;

export class MetricsPublisher {
    private publishData: MetricsPublishedData = null;

    constructor(
        private readonly provider: MetricsDataProvider,
        private readonly sessionProvider: SessionDataProvider,
        private readonly websocket: WebSocketAdapter,
    ) { }

    publish(): void {
        this.publishData = {
            systemStaticInfo: this.provider.getSystemStaticInfo(),
            dashboardData: this.provider.getDashboardData(),
            dashboardTickData: this.provider.getDashboardTickData(),
            analyticsData: this.provider.getAnalyticsData(),
            healthData: this.provider.getHealthData(),
        };


        //? consider sending only the changed data instead of sending all data every time
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_SYSTEM_DATA,
            this.publishData.systemStaticInfo
        );
        this.websocket.broadcast(WebSocketEvents.RESPONSE_DASHBOARD_TICK_DATA, this.publishData.dashboardTickData);
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_ANALYTICS_DATA,
            this.publishData.analyticsData
        );
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_HEALTH_DATA,
            this.publishData.healthData
        );
    }

    retrieveLastPublishedData(): MetricsPublishedData {
        return this.publishData;
    }
}