"use client";
import React from "react";
import {
    useConnection,
    WebSocketEvents
} from "./connection.context";
import type {
    AnalyticsData,
    CorrelationData,
    DashboardData,
    EndpointTelemetry,
    HealthData,
    HealthDetails,
    SessionRecord,
    SessionSummary,
    SystemStaticInfo,
    SystemStatus,
    BucketsMessage,
    IncidentsSnapshot,
} from '../domain';
import { mockAnalyticsData, mockHealthDetails, mockSessionData, mockCorrelationData } from '../components/utility/mocking';
import {
    initialLiveState,
    liveBucketsReducer,
    toDashboardSeries,
    toHealthData,
    selectWindow,
    emptyDashboardSeries
} from "../stores/live-bucket.store";

const BACKFILL_TIMEOUT_MS = 5000;

const MetricsContext = React.createContext<{
    data: MetricsData;
    dashboard: DashboardData;
    analyticsFilterSettings: AnalyticsFilterSettings;
    updateAnalyticsFilters: (newFilters: Partial<AnalyticsFilterSettings>) => void;
    sessions: SessionRecord[];
    selectedSession: number | null;
    selectedSessionSummary: SessionSummary | null;
    selectSession: (sessionNumber: number | null) => void;
    downloadSession: (sessionNumber: number) => Promise<void>;
} | null>(null);

type MetricsState = {
    systemStatus: SystemStatus;
    systemInfo: SystemStaticInfo;
    analytics: AnalyticsData;
    healthDetails: HealthDetails;
    correlation: CorrelationData;

    impactEndpoints: EndpointTelemetry[];
    incidents: IncidentsSnapshot;
}

export type MetricsData = Omit<MetricsState, 'healthDetails'> & {
    health: HealthData;
};

export type AnalyticsFilterSettings = {
    query: string;
    method: 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE';
    page: number;
};

export function MetricsProvider({
    children
}: { children: React.ReactNode }) {
    const { isConnected, registerEventListener, unregisterEventListener, emit } = useConnection();

    const subscriptionId = React.useRef(crypto.randomUUID());
    const backfillPending = React.useRef<{ afterSequence: number | null; timer: ReturnType<typeof setTimeout> } | null>(null);

    const [live, dispatch] = React.useReducer(liveBucketsReducer, initialLiveState);
    const liveRef = React.useRef(live);
    React.useEffect(() => { liveRef.current = live; }, [live]);

    const liveWindow = React.useMemo(() => selectWindow(live), [live]);

    const [state, setData] = React.useState<MetricsState>({
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
        analytics: mockAnalyticsData(),
        healthDetails: mockHealthDetails(),
        impactEndpoints: [],
        incidents: { rules: [], incidents: [], serverTime: '' },
        correlation: mockCorrelationData()
    });

    const dashboard = React.useMemo<DashboardData>(
        () => liveWindow.latest ? toDashboardSeries(liveWindow) : emptyDashboardSeries(),
        [liveWindow]
    );

    const data = React.useMemo<MetricsData>(() => {
        const { healthDetails, ...rest } = state;
        return { ...rest, health: toHealthData(liveWindow, healthDetails) };
    }, [state, liveWindow]);

    const [filters, setFilters] = React.useState<AnalyticsFilterSettings>({
        query: '',
        method: 'ALL',
        page: 1
    });
    const filtersRef = React.useRef(filters);
    const [sessions, setSessions] = React.useState<SessionRecord[]>(mockSessionData());
    const [selectedSession, setSelectedSession] = React.useState<number | null>(null);
    const [selectedSessionSummary, setSelectedSessionSummary] = React.useState<SessionSummary | null>(null);

    function haveFilters(f: AnalyticsFilterSettings): boolean {
        return f.query !== '' || f.method !== 'ALL' || f.page !== 1;
    }

    React.useEffect(() => {
        if (!isConnected) return;

        const listeners: Array<[WebSocketEvents, Parameters<typeof registerEventListener>[1]]> = [
            [WebSocketEvents.RESPONSE_SESSION_METADATA, sessionMetadata => {
                setSessions(sessionMetadata.sessions);
                setSelectedSession(null);
                setSelectedSessionSummary(null);
            }],
            [WebSocketEvents.RESPONSE_SESSION_SUMMARY, sessionSummary => {
                if (!sessionSummary) return;
                setSelectedSessionSummary(sessionSummary);
                setSelectedSession(sessionSummary.sessionNumber);
            }],
            [WebSocketEvents.RESPONSE_SYSTEM_DATA, systemData => {
                setData(prev => ({ ...prev, systemInfo: systemData }));
            }],
            [WebSocketEvents.RESPONSE_ANALYTICS_DATA, (analyticsData: AnalyticsData) => {
                if (haveFilters(filtersRef.current)) {
                    setData(prev => ({ ...prev, impactEndpoints: analyticsData.impactEndpoints }));
                    emit(WebSocketEvents.REQUEST_ANALYTICS_DATA, filtersRef.current);
                } else {
                    setData(prev => ({ ...prev, analytics: analyticsData, impactEndpoints: analyticsData.impactEndpoints }));
                }
            }],
            [WebSocketEvents.RESPONSE_FILTERED_ANALYTICS_DATA, (analyticsData: AnalyticsData) => {
                setData(prev => ({ ...prev, analytics: analyticsData, impactEndpoints: analyticsData.impactEndpoints }));
            }],
            [WebSocketEvents.RESPONSE_HEALTH_DATA, healthData => {
                setData(prev => ({ ...prev, healthDetails: healthData }));
            }],
            [WebSocketEvents.RESPONSE_CORRELATION_DATA, correlationData => {
                setData(prev => ({ ...prev, correlation: correlationData }));
            }],
            [WebSocketEvents.RESPONSE_INCIDENTS, (incidents: IncidentsSnapshot) => {
                setData(prev => ({ ...prev, incidents }));
            }],
            [WebSocketEvents.RESPONSE_DASHBOARD_BUCKETS, (msg: BucketsMessage) => {
                if (msg.subscriptionId !== null && msg.subscriptionId !== subscriptionId.current) return;
                if (msg.kind === 'backfill') clearBackfill();
                dispatch({ type: 'MESSAGE', message: msg });
            }],
        ];
        for (const [event, cb] of listeners) registerEventListener(event, cb);

        emit(WebSocketEvents.REQUEST_SYSTEM_DATA, null);
        emit(WebSocketEvents.REQUEST_ANALYTICS_DATA, null);
        emit(WebSocketEvents.REQUEST_HEALTH_DATA, null);
        emit(WebSocketEvents.REQUEST_CORRELATION_DATA, null);
        emit(WebSocketEvents.REQUEST_INCIDENTS, null);
        emit(WebSocketEvents.REQUEST_SESSION_METADATA, null);

        clearBackfill();
        requestBackfill(liveRef.current.latestSequence);

        return () => {
            for (const [event, cb] of listeners) unregisterEventListener(event, cb);
            clearBackfill();
        };
    }, [isConnected]);

    React.useEffect(() => {
        if (!isConnected || backfillPending.current || liveWindow.missing.length === 0) return;
        requestBackfill(Math.min(...liveWindow.missing) - 1);
    }, [liveWindow, isConnected]);

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

    function clearBackfill() {
        if (backfillPending.current) clearTimeout(backfillPending.current.timer);
        backfillPending.current = null;
    }

    function requestBackfill(afterSequence: number | null) {
        const l = liveRef.current;
        let afterEndTime: string | null = null;
        if (afterSequence !== null) {
            for (const b of l.buckets.values()) {
                if (b.sequence === afterSequence) { afterEndTime = b.endTime; break; }
            }
        }
        clearBackfill();
        backfillPending.current = {
            afterSequence,
            timer: setTimeout(() => { backfillPending.current = null; }, BACKFILL_TIMEOUT_MS),
        };
        emit(WebSocketEvents.REQUEST_DASHBOARD_BUCKETS, {
            subscriptionId: subscriptionId.current,
            sessionId: l.sessionId,
            afterSequence: l.sessionId === null ? null : afterSequence,
            afterEndTime,
        });
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

    return (
        <MetricsContext.Provider value={{
            data,
            dashboard,
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