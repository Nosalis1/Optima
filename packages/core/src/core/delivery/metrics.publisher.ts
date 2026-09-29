import type {
    WebSocketAdapter
} from "../../adapters/websocket.adapter";
import type {
    SystemStaticInfo,
    AnalyticsData,
    DashboardData,
    DashboardTickData,
    HealthData,
    SessionRecord,
    SessionManifest,
    SessionSummary,
    AnalyticsFilterSettings,
    CorrelationData,
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
    getSessionRecord(): SessionRecord | null;
    getSessionManifest(): Promise<SessionManifest>;
    getSessionSummary(sessionNumber: number): Promise<SessionSummary | null>;
}

export interface CorrelationDataProvider {
    pack(): CorrelationData;
}

type MetricsPublishedData = {
    systemStaticInfo: SystemStaticInfo;
    dashboardData: DashboardData;
    dashboardTickData: DashboardTickData;
    analyticsData: AnalyticsData;
    healthData: HealthData;
    correlationData: CorrelationData;
} | null;

export class MetricsPublisher {
    private publishData: MetricsPublishedData = null;

    constructor(
        private readonly provider: MetricsDataProvider,
        private readonly sessionProvider: SessionDataProvider,
        private readonly correlationProvider: CorrelationDataProvider,
        private readonly websocket: WebSocketAdapter,
    ) { }

    publish(): void {
        this.publishData = {
            systemStaticInfo: this.provider.getSystemStaticInfo(),
            dashboardData: this.provider.getDashboardData(),
            dashboardTickData: this.provider.getDashboardTickData(),
            analyticsData: this.provider.getAnalyticsData(),
            healthData: this.provider.getHealthData(),
            correlationData: this.correlationProvider.pack(),
        };

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
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_CORRELATION_DATA,
            this.publishData.correlationData
        );
    }

    retrieveLastPublishedData(): MetricsPublishedData {
        return this.publishData;
    }
}