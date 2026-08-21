import { ConnectionStatus, HealthStatus } from './common.types';

export interface SystemStatus {
    connectionStatus: ConnectionStatus;
    healthStatus: HealthStatus;
    webSocketStatus: ConnectionStatus;
}

export interface SystemStaticInfo {
    uptime: number;
    nodeVersion: string;
    env: string;
}

export interface V8RuntimeInfo {
    pid: number;
    platform: string;
    nodeVersion: string;
    v8Version: string;
    libuvVersion: string;
    openSSLVersion: string;
    threadPoolSize: number;
    activeThreads: number;
    startup: {
        bootstrapTime: number;
        requiredModules: number;
    };
}