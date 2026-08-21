export interface TelemetryRequest {
    timestamp: number; // Timestamp when the request was done
    endpoint: string; // The endpoint that was called
    method: string; // HTTP method used for the request
    statusCode: number; // HTTP status code returned by the server
    responseTime: number; // Response time in milliseconds
    clientIp?: string; // IP address of the client making the request
}