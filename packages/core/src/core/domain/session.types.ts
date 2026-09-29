
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
 * @property {number} lastCommitedSequence - The last committed sequence number for the session's data.
 * @property {SessionStatus} status - The current status of the session, which can be 'RUNNING', 'COMPLETED', or 'INTERRUPTED'.
 */
export type SessionRecord = {
    sessionId: string;
    sessionNumber: number;
    startedAt: string;
    endedAt: string | null;
    lastPersistedAt: string | null;
    lastCommitedSequence: number;
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

/**
 * Represents a summary of metrics for a single hour within a session, including counts of client and server errors, average and maximum requests per second (RPS), average and maximum latency, counts of healthy and slow endpoints, and the number of samples collected.
 * @property {string} hourStart - The ISO string representing the start of the hour for which metrics are summarized.
 * @property {number} clientErrorCount - The total number of client errors (HTTP 4xx) recorded during the hour.
 * @property {number} serverErrorCount - The total number of server errors (HTTP 5xx) recorded during the hour.
 * @property {number} avgRps - The average requests per second (RPS) recorded during the hour.
 * @property {number} maxRps - The maximum requests per second (RPS) recorded during the hour.
 * @property {number} avgLatency - The average latency (in milliseconds) recorded during the hour.
 * @property {number} maxLatency - The maximum latency (in milliseconds) recorded during the hour.
 * @property {number} healthyEndpointCount - The count of endpoints that were considered healthy during the hour.
 * @property {number} slowEndpointCount - The count of endpoints that were considered slow during the hour.
 * @property {number} sampleCount - The total number of samples collected for metrics during the hour.
 */
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

/**
 * Represents a summary of metrics for an entire session, including its number, start and end times, counts of client and server errors, average and maximum requests per second (RPS), average and maximum latency, hourly breakdowns of metrics, and the total number of samples collected.
 * @property {number} sessionNumber - The unique number identifying the session.
 * @property {string} startedAt - The ISO string representing when the session started.
 * @property {string | null} endedAt - The ISO string representing when the session ended, or null if it is currently running.
 * @property {string} windowStart - The ISO string representing the start of the time window for which metrics are summarized.
 * @property {string} windowEnd - The ISO string representing the end of the time window for which metrics are summarized.
 * @property {number} clientErrorCount - The total number of client errors (HTTP 4xx) recorded during the session.
 * @property {number} serverErrorCount - The total number of server errors (HTTP 5xx) recorded during the session.
 * @property {number} avgRps - The average requests per second (RPS) recorded during the session.
 * @property {number} maxRps - The maximum requests per second (RPS) recorded during the session.
 * @property {number} avgLatency - The average latency (in milliseconds) recorded during the session.
 * @property {number} maxLatency - The maximum latency (in milliseconds) recorded during the session.
 * @property {HourlyBucket[]} perHour - An array of hourly bucket summaries, each representing metrics for a single hour within the session.
 * @property {number} sampleCount - The total number of samples collected for metrics during the session.
 */
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