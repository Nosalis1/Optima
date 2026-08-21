// Shared system primitives
export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'DISCONNECTED';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';
export type SeverityLevel = 'info' | 'advisory' | 'warning' | 'critical';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD';

// Universal network route identifiers
export interface EndpointRoute {
    method: HttpMethod | string;
    route: string;
}

// Universal UI elements
export interface AlertMessage {
    title: string;
    timestamp: string;
    severity: SeverityLevel;
}

export interface PaginationMeta {
    page: number;
    pageSize: number;
    perPageCount: number;
    totalCount: number;
}