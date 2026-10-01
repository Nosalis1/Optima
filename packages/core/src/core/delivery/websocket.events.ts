export enum WebSocketEvents {
    REQUEST_SESSION_METADATA = "request-session-metadata",
    RESPONSE_SESSION_METADATA = "response-session-metadata",

    REQUEST_SESSION_SUMMARY = "request-session-summary",
    RESPONSE_SESSION_SUMMARY = "response-session-summary",

    REQUEST_CONFIGURATION = "request-configuration",
    RESPONSE_CONFIGURATION = "response-configuration",

    REQUEST_SYSTEM_DATA = "request-system-data",
    RESPONSE_SYSTEM_DATA = "response-system-data",

    REQUEST_ANALYTICS_DATA = "request-analytics-data",
    RESPONSE_ANALYTICS_DATA = "response-analytics-data",
    RESPONSE_FILTERED_ANALYTICS_DATA = "response-filtered-analytics-data",

    REQUEST_HEALTH_DATA = "request-health-data",
    RESPONSE_HEALTH_DATA = "response-health-data",

    REQUEST_CORRELATION_DATA = "request-correlation-data",
    RESPONSE_CORRELATION_DATA = "response-correlation-data",

    REQUEST_CORRELATION_REPLAY = "request-correlation-replay",
    RESPONSE_CORRELATION_REPLAY = "response-correlation-replay",

    REQUEST_INCIDENTS = "request-incidents",
    RESPONSE_INCIDENTS = "response-incidents",

    REQUEST_DASHBOARD_BUCKETS = "request-dashboard-buckets",
    RESPONSE_DASHBOARD_BUCKETS = "response-dashboard-buckets",
}