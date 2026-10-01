import type { Incident } from './incident.types';


export type SessionStatus = 'RUNNING' | 'COMPLETED' | 'INTERRUPTED';

export type SessionRecord = {
    sessionId: string;
    sessionNumber: number;
    startedAt: string;
    endedAt: string | null;
    lastPersistedAt: string | null;
    lastCommittedSequence: number;
    status: SessionStatus;
}

export interface SessionManifest {
    version: 2;
    sessions: SessionRecord[];
}

export interface SessionSummaryPoint {
    startTime: string;
    durationMs: number;
    requestCount: number;
    rps: number;
    maxRps: number;
    p95: number;
    serverErrorRate: number;
    clientErrorCount: number;
    serverErrorCount: number;
}

export interface SessionRouteImpact {
    method: string;
    route: string;
    requestCount: number;
    impactedRequests: number;
    p95: number;
    serverErrorRate: number;
}

export interface SessionSummary {
    sessionId: string;
    sessionNumber: number;
    status: SessionStatus;
    startedAt: string;
    endedAt: string | null;
    windowStart: string;
    windowEnd: string;
    measuredMs: number;
    traffic: {
        requestCount: number;
        avgRps: number;
        peakRps: number;
    };
    latency: {
        p50: number;
        p95: number;
        p99: number;
        max: number;
    };
    errors: {
        serverErrorCount: number;
        serverErrorRate: number;
        clientErrorCount: number;
    };
    incidents: Incident[];
    topRoutes: SessionRouteImpact[];
    series: {
        resolutionMs: number;
        points: SessionSummaryPoint[];
    };
    quality: {
        bucketCount: number;
        missingIntervals: number;
        conflicts: number;
        complete: boolean;
    };
}
