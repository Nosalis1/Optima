export interface SessionMetadata {
    sessionNumber: number;
    recoveredFromCrash: boolean;
    startedAt: string;
    endedAt: string | null; // null if currently running
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