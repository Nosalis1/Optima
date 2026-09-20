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
    SessionMetadata,
    SessionSummary,
    SystemStaticInfo,
    SystemStatus,
} from '../domain';
import { mockDashboardData, mockAnalyticsData, mockHealthData, mockSessionData, mockSessionSummary } from '../components/utility/mocking';

const MetricsContext = React.createContext<{
    data: MetricsData;
    analyticsFilterSettings: AnalyticsFilterSettings;
    updateAnalyticsFilters: (newFilters: Partial<AnalyticsFilterSettings>) => void;
    sessions: SessionMetadata[];
    selectedSession: number | null;
    selectedSessionSummary: SessionSummary | null;
    selectSession: (sessionNumber: number | null) => void;
    downloadSession: (sessionNumber: number) => Promise<void>;
} | null>(null);

export type MetricsData = {
    systemStatus: SystemStatus;
    systemInfo: SystemStaticInfo;
    dashboard: DashboardData;
    analytics: AnalyticsData;
    health: HealthData;
}

export type AnalyticsFilterSettings = {
    query: string;
    method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE';
    status: 'ALL' | '2xx' | '4xx' | '5xx';
    page: number;
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
        query: '',
        method: 'ALL',
        status: 'ALL',
        page: 1
    });
    const filtersRef = React.useRef(filters);
    const [sessions, setSessions] = React.useState<SessionMetadata[]>(mockSessionData());
    const [selectedSession, setSelectedSession] = React.useState<number | null>(null);
    const [selectedSessionSummary, setSelectedSessionSummary] = React.useState<SessionSummary | null>(null);

    function haveFilters(f: AnalyticsFilterSettings): boolean {
        return f.query !== '' || f.method !== 'ALL' || f.status !== 'ALL' || f.page !== 1;
    }

    React.useEffect(() => {
        if (!isConnected) {
            cleanup();
            return;
        }

        try {
            registerEventListener(WebSocketEvents.RESPONSE_SESSION_METADATA, sessionMetadata => {
                setSessions(sessionMetadata.sessionHistory);
                setSelectedSession(null);
                setSelectedSessionSummary(null);
            });
            registerEventListener(WebSocketEvents.RESPONSE_SESSION_SUMMARY, sessionSummary => {
                setSelectedSessionSummary(sessionSummary);
                setSelectedSession(sessionSummary.sessionNumber);
            });
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
                if (haveFilters(filtersRef.current)) {
                    console.log("Received analytics data but filters are active.");
                    emit(WebSocketEvents.REQUEST_ANALYTICS_DATA, filtersRef.current);
                } else {
                    console.log("Received analytics data.");
                    setData(prev => ({
                        ...prev,
                        analytics: analyticsData
                    }));
                }
            });
            registerEventListener(WebSocketEvents.RESPONSE_FILTERED_ANALYTICS_DATA, analyticsData => {
                console.log("Received filtered analytics data:", analyticsData);
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
            emit(WebSocketEvents.REQUEST_ANALYTICS_DATA, null);
            emit(WebSocketEvents.REQUEST_HEALTH_DATA, null);
            emit(WebSocketEvents.REQUEST_SESSION_METADATA, null);
        } catch (error) {
            console.error("Error fetching system status:", error);
        }

    }, [isConnected]);

    React.useEffect(() => {
        filtersRef.current = filters;
    }, [filters]);

    function selectSession(sessionNumber: number | null) {
        if (sessionNumber === null) {
            setSelectedSessionSummary(null);
            setSelectedSession(sessionNumber);
            return;
        }

        emit(WebSocketEvents.REQUEST_SESSION_SUMMARY, { sessionNumber });
    }

    async function downloadSession(sessionNumber: number) {
        const basePath = window.location.origin;
        const response = await fetch(`${basePath}/optima/session/${sessionNumber}/export`);
        if (!response.ok) throw new Error(`Failed to download session ${sessionNumber}: ${response.statusText}`);

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-${sessionNumber}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    function updateAnalyticsFilters(newFilters: Partial<AnalyticsFilterSettings>) {
        console.log("Updating analytics filters:", newFilters);
        setFilters(prev => {
            const updatedFilters = { ...prev, ...newFilters };
            emit(WebSocketEvents.REQUEST_ANALYTICS_DATA, updatedFilters);
            return updatedFilters;
        });
    }

    function cleanup() {

    }

    return (
        <MetricsContext.Provider value={{
            data,
            analyticsFilterSettings: filters,
            sessions,
            selectedSession,
            selectedSessionSummary,
            updateAnalyticsFilters,
            selectSession,
            downloadSession
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