// Shared system primitives
export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'DISCONNECTED';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
export type SeverityLevel = 'info' | 'advisory' | 'warning' | 'critical';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';
export type StatusCategory = '2xx' | '3xx' | '4xx' | '5xx' | 'unknown';

/**
 * Represents a network route with its associated HTTP method and path.
 * @property {HttpMethod | string} method - The HTTP method for the route (e.g., GET, POST).
 * @property {string} route - The path of the route (e.g., '/api/users').
 */
export interface EndpointRoute {
    method: HttpMethod | string;
    route: string;
}

/**
 * Represents an alert message with a title, timestamp, and severity level.
 * @property {string} title - The title or summary of the alert.
 * @property {string} timestamp - The timestamp when the alert was generated (ISO 8601 format).
 * @property {SeverityLevel} severity - The severity level of the alert (info, advisory, warning, critical).
 */
export interface AlertMessage {
    title: string;
    timestamp: string;
    severity: SeverityLevel;
}

/**
 * Represents pagination metadata for paginated data responses.
 * @property {number} page - The current page number.
 * @property {number} pageSize - The actual number of items returned on the current page.
 * @property {number} perPageCount - The number of items per page.
 * @property {number} totalCount - The total number of items available across all pages.
 */
export interface PaginationMeta {
    page: number;
    pageSize: number;
    perPageCount: number;
    totalCount: number;
}

/**
 * Categorizes an HTTP status code into a broader status category.
 * @param statusCode - The HTTP status code to categorize.
 * @returns A string representing the status category: '2xx', '3xx', '4xx', '5xx', or 'unknown'.
 */
export function categorizeStatusCode(statusCode: number): StatusCategory {
    if (statusCode >= 200 && statusCode < 300) return '2xx';
    else if (statusCode >= 300 && statusCode < 400) return '3xx';
    else if (statusCode >= 400 && statusCode < 500) return '4xx';
    else if (statusCode >= 500 && statusCode < 600) return '5xx';
    else return 'unknown';
}