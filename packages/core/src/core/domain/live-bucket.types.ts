/**
 * A DTO representing a live bucket of telemetry data.
 * @property bucketId - The unique identifier for the bucket.
 * @property sequence - The sequence number of the bucket.
 * @property startTime - The ISO string representing when the bucket started.
 * @property endTime - The ISO string representing when the bucket ended.
 * @property durationMs - The duration of the bucket in milliseconds.
 * @property committed - A boolean indicating whether the bucket has been committed.
 * @property qualityFlags - An array of strings representing quality flags for the bucket.
 * @property requestCount - The total number of requests recorded in the bucket.
 * @property clientErrorCount - The total number of client errors (HTTP 4xx) recorded in the bucket.
 * @property serverErrorCount - The total number of server errors (HTTP 5xx) recorded in the bucket.
 * @property rps - The average requests per second (RPS) recorded in the bucket.
 * @property averageLatencyMs - The average latency (in milliseconds)   
 * @property p50Ms - The 50th percentile latency (in milliseconds) recorded in the bucket.
 * @property p95Ms - The 95th percentile latency (in milliseconds) recorded in the bucket.
 * @property p99Ms - The 99th percentile latency (in milliseconds) recorded in the bucket.
 * @property errorRate - The error rate (as a decimal) recorded in the bucket.
 * @property runtime - An object containing runtime metrics for the bucket, including event loop lag, heap usage, heap size, RSS memory, and heap limit.
 */
export interface LiveBucketDto {
    bucketId: string;
    sequence: number;
    startTime: string;
    endTime: string;
    durationMs: number;
    committed: boolean;
    qualityFlags: string[];

    requestCount: number;
    clientErrorCount: number;
    serverErrorCount: number;
    rps: number;
    averageLatencyMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    errorRate: number;

    runtime: {
        eventLoopLagMs: number;
        heapUsageBytes: number;
        heapSizeBytes: number;
        rssMemoryBytes: number;
        heapLimitBytes: number;
        cpuPercent: number;
        cpuUserPercent: number;
        cpuSystemPercent: number;
    };
}

/**
 * A message containing a set of live buckets.
 * @property subscriptionId - The subscription ID for the message. If null, the message is for all subscriptions.
 * @property sessionId - The session ID for the message.
 * @property kind - The kind of buckets in the message. Either 'live' or 'backfill'.
 * @property buckets - The array of live bucket DTOs.
 * @property lastSequence - The last sequence number of the buckets in the message. If null, there are no buckets in the message.
 * @property requestedAfterSequence - The sequence number after which the buckets were requested. If null, the request was for all buckets.
 * @property gaps - An array of gaps in the bucket sequences. Each gap is represented as a tuple of [startSequence, endSequence].
 * @property truncated - Whether the message was truncated due to a limit on the number of buckets returned.
 * @property serverTime - The server time when the message was generated.
 */
export interface BucketsMessage {
    subscriptionId: string | null;
    sessionId: string;
    kind: 'live' | 'backfill';
    buckets: LiveBucketDto[];
    lastSequence: number | null;
    requestedAfterSequence: number | null;
    gaps: Array<[number, number]>;
    truncated: boolean;
    serverTime: string;
}

/**
 * A request for a set of buckets.
 * @property subscriptionId - The subscription ID for the request.
 * @property sessionId - The session ID for the request. If null, the request is for all sessions.
 * @property afterSequence - The sequence number after which to return buckets. If null, return from the beginning.
 * @property afterEndTime - The end time after which to return buckets. If null, return from the beginning.
 * @property limit - The maximum number of buckets to return. If not specified, return all available buckets.
 */
export interface BucketsRequest {
    subscriptionId: string;
    sessionId: string | null;
    afterSequence: number | null;
    afterEndTime: string | null;
    limit?: number;
}