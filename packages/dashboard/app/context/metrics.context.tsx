"use client";
import React from "react";
import {
    useConnection,
    WebSocketEvents
} from "./connection.context";
import type {
    AnalyticsData,
    DashboardData,
    HealthData,
    SystemStaticInfo,
    SystemStatus,
} from '../domain';
import { mockDashboardData, mockAnalyticsData, mockHealthData } from '../components/utility/mocking';

const MetricsContext = React.createContext<{
    data: MetricsData;
} | null>(null);

export type MetricsData = {
    systemStatus: SystemStatus;
    systemInfo: SystemStaticInfo;
    dashboard: DashboardData;
    analytics: AnalyticsData;
    health: HealthData;
}

export type AnalyticsFilterSettings = {
    method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE';
    status: 'ALL' | '2xx' | '4xx' | '5xx';
};

export function MetricsProvider({
    children
}: { children: React.ReactNode }) {
    const { isConnected, registerEventListener, emit } = useConnection();

    const [data, setData] = React.useState<MetricsData>({
        systemStatus: {
            connectionStatus: 'ONLINE',
            healthStatus: 'HEALTHY',
            webSocketStatus: 'DISCONNECTED'
        },
        systemInfo: {
            nodeVersion: 'v0.0.0',
            uptime: 800,
            env: 'development'
        },
        dashboard: mockDashboardData(),
        analytics: mockAnalyticsData(),
        health: mockHealthData(),
    });
    const [filters, setFilters] = React.useState<AnalyticsFilterSettings>({
        method: 'ALL',
        status: 'ALL'
    });

    React.useEffect(() => {
        if (!isConnected) {
            cleanup();
            return;
        }

        try {
            registerEventListener(WebSocketEvents.RESPONSE_SYSTEM_DATA, systemData => {
                setData(prev => ({
                    ...prev,
                    systemInfo: systemData
                }));
            });
            registerEventListener(WebSocketEvents.RESPONSE_DASHBOARD_DATA, dashboardData => {
                setData(prev => ({
                    ...prev,
                    dashboard: dashboardData
                }));
            });
            registerEventListener(WebSocketEvents.RESPONSE_ANALYTICS_DATA, analyticsData => {
                setData(prev => ({
                    ...prev,
                    analytics: analyticsData
                }));
            });
            registerEventListener(WebSocketEvents.RESPONSE_HEALTH_DATA, healthData => {
                setData(prev => ({
                    ...prev,
                    health: healthData
                }));
            });

            emit(WebSocketEvents.REQUEST_SYSTEM_DATA, null);
            emit(WebSocketEvents.REQUEST_DASHBOARD_DATA, null);
            emit(WebSocketEvents.REQUEST_ANALYTICS_DATA, filters);
            emit(WebSocketEvents.REQUEST_HEALTH_DATA, null);
        } catch (error) {
            console.error("Error fetching system status:", error);
        }

    }, [isConnected]);

    function cleanup() {

    }

    return (
        <MetricsContext.Provider value={{
            data
        }}>
            {children}
        </MetricsContext.Provider>
    );
}

export function useMetrics() {
    const context = React.useContext(MetricsContext);
    if (!context) {
        throw new Error('useMetrics must be used within a MetricsProvider');
    }
    return context;
}