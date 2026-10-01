import type { Incident } from './incident.types';


/**
 * Represents the status of a session, which can be either 'RUNNING', 'COMPLETED', or 'INTERRUPTED'.
 * - 'RUNNING': The session is currently active and ongoing.
 * - 'COMPLETED': The session has finished successfully.
 * - 'INTERRUPTED': The session was interrupted before completion, possibly due to an error or unexpected shutdown.
 */
export type SessionStatus = 'RUNNING' | 'COMPLETED' | 'INTERRUPTED';

/**
 * Represents a record of a session, containing essential information about the session's lifecycle and status.
 * @property {string} sessionId - A unique identifier for the session.
 * @property {number} sessionNumber - A sequential number representing the order of the session.
 * @property {string} startedAt - The ISO string representing when the session started.
 * @property {string | null} endedAt - The ISO string representing when the session ended, or null if it is currently running.
 * @property {string | null} lastPersistedAt - The ISO string representing when the session's data was last persisted, or null if it has not been persisted yet.
 * @property {number} lastCommittedSequence - The last committed sequence number for the session's data.
 * @property {SessionStatus} status - The current status of the session, which can be 'RUNNING', 'COMPLETED', or 'INTERRUPTED'.
 */
export type SessionRecord = {
    sessionId: string;
    sessionNumber: number;
    startedAt: string;
    endedAt: string | null;
    lastPersistedAt: string | null;
    lastCommittedSequence: number;
    status: SessionStatus;
}

/**
 * Represents a manifest of sessions, containing a version number and an array of session records.
 * @property {number} version - The version number of the session manifest.
 * @property {SessionRecord[]} sessions - An array of session records, each representing a single session's information.
 */
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
