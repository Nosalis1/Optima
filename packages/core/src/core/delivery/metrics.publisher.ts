import type {
    WebSocketAdapter
} from "../../adapters/websocket.adapter";
import type {
    SystemStaticInfo,
    AnalyticsData,
    DashboardData,
    HealthData,
} from "../domain";
import {
    WebSocketEvents
} from "./websocket.events";

export interface MetricsDataProvider {
    getSystemStaticInfo(): SystemStaticInfo;
    getDashboardData(): DashboardData;
    getAnalyticsData(): AnalyticsData;
    getHealthData(): HealthData;
}

export class MetricsPublisher {
    private interval?: NodeJS.Timeout;

    constructor(
        private readonly provider: MetricsDataProvider,
        private readonly websocket: WebSocketAdapter,
        private readonly intervalMs: number = 1000
    ) { }

    start(): void {
        if (this.interval) return;

        this.interval = setInterval(() => {
            this.publish();
        }, this.intervalMs);
    }

    stop(): void {
        if (!this.interval) return;
        clearInterval(this.interval);
        this.interval = undefined;
    }

    private publish(): void {
        //? consider sending only the changed data instead of sending all data every time
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_SYSTEM_DATA,
            this.provider.getSystemStaticInfo()
        );
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_DASHBOARD_DATA,
            this.provider.getDashboardData()
        );
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_ANALYTICS_DATA,
            this.provider.getAnalyticsData()
        );
        this.websocket.broadcast(
            WebSocketEvents.RESPONSE_HEALTH_DATA,
            this.provider.getHealthData()
        );
    }
}