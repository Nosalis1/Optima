import type {
    WebSocketAdapter
} from "../../adapters/websocket.adapter";
import type {
    SystemStaticInfo,
    AnalyticsData,
    HealthDetails,
    SessionRecord,
    SessionManifest,
    SessionSummary,
    AnalyticsFilterSettings,
    CorrelationData,
    BucketsMessage,
    BucketsRequest,
    IncidentsSnapshot,
} from "../domain";
import {
    WebSocketEvents
} from "./websocket.events";

export interface MetricsDataProvider {
    getSystemStaticInfo(): SystemStaticInfo;
    getLiveBuckets(): BucketsMessage | null;
    getBackFill(req: BucketsRequest): Promise<BucketsMessage>;
    getAnalyticsData(filters?: AnalyticsFilterSettings): AnalyticsData;
    getHealthData(): HealthDetails;
}

export interface SessionDataProvider {
    getSessionRecord(): SessionRecord | null;
    getSessionManifest(): Promise<SessionManifest>;
    getSessionSummary(sessionNumber: number): Promise<SessionSummary | null>;
}

export interface IncidentDataProvider {
    snapshot(): IncidentsSnapshot;
}

export interface CorrelationDataProvider {
    pack(): CorrelationData;
    replay(findingId: string): Promise<unknown>;
}

type MetricsPublishedData = {
    systemStaticInfo: SystemStaticInfo;
    analyticsData: AnalyticsData;
    healthData: HealthDetails;
    correlationData: CorrelationData;
} | null; //! Remove this

export class MetricsPublisher {
    private publishData: MetricsPublishedData = null;

    constructor(
        private readonly provider: MetricsDataProvider,
        private readonly sessionProvider: SessionDataProvider,
        private readonly correlationProvider: CorrelationDataProvider,
        private readonly incidentProvider: IncidentDataProvider,
        private readonly websocket: WebSocketAdapter,
    ) { }

    publish(): void {
        this.publishData = {
            systemStaticInfo: this.provider.getSystemStaticInfo(),
            analyticsData: this.provider.getAnalyticsData(),
            healthData: this.provider.getHealthData(),
            correlationData: this.correlationProvider.pack(),
        };

        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_SYSTEM_DATA,
            this.publishData.systemStaticInfo
        );
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

        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_INCIDENTS,
            this.incidentProvider.snapshot()
        );

        const live = this.provider.getLiveBuckets();
        if (live) this.websocket.broadcast(
            WebSocketEvents.RESPONSE_DASHBOARD_BUCKETS,
            live
        );
    }
}