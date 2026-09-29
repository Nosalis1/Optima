
export type SessionStatus = 'RUNNING' | 'COMPLETED' | 'INTERRUPTED';

export type SessionRecord = {
    sessionId: string;
    sessionNumber: number;
    startedAt: string;
    endedAt: string | null;
    lastPersistedAt: string | null;
    lastCommitedSequence: number;
    status: SessionStatus;
}

export interface SessionManifest {
    version: 2;
    sessions: SessionRecord[];
}

export interface HourlyBucket {
    hourStart: string;
    clientErrorCount: number;
    serverErrorCount: number;
    avgRps: number;
    maxRps: number;
    avgLatency: number;
    maxLatency: number;
    healthyEndpointCount: number;
    slowEndpointCount: number;
    sampleCount: number;
}

export interface SessionSummary {
    sessionNumber: number;
    startedAt: string;
    endedAt: string | null;
    windowStart: string;
    windowEnd: string;
    clientErrorCount: number;
    serverErrorCount: number;
    avgRps: number;
    maxRps: number;
    avgLatency: number;
    maxLatency: number;
    perHour: HourlyBucket[];
    sampleCount: number;
}