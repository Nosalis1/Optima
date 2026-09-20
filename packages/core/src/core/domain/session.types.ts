/**
 * Represents the metadata for a single session, including its number, whether it was recovered from a crash, and its start and end times.
 * @property {number} sessionNumber - The unique number identifying the session.
 * @property {boolean} recoveredFromCrash - Indicates whether the session was recovered from a crash.
 * @property {string} startedAt - The ISO string representing when the session started.
 * @property {string | null} endedAt - The ISO string representing when the session ended, or null if it is currently running.
 */
export interface SessionMetadata {
    sessionNumber: number;
    recoveredFromCrash: boolean;
    startedAt: string;
    endedAt: string | null;
}

/**
 * Represents the manifest of all sessions, including the total number of sessions, the last started and shutdown times, and a history of session metadata.
 * @property {number} totalSessions - The total number of sessions recorded.
 * @property {string} lastStartedAt - The ISO string representing when the last session started.
 * @property {string | null} lastShutdownAt - The ISO string representing when the last session ended, or null if it is currently running.
 * @property {SessionMetadata[]} sessionHistory - An array of session metadata objects, each representing a single session's details.
 */
export interface SessionManifest {
    totalSessions: number;
    lastStartedAt: string;
    lastShutdownAt: string | null;
    sessionHistory: SessionMetadata[];
};

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