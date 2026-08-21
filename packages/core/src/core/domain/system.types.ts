import type {
    ConnectionStatus,
    HealthStatus
} from './common.types';

/**
 * Represents the overall system status, including connection status, health status, and WebSocket connection status.
 * @property {ConnectionStatus} connectionStatus - The current connection status of the system (ONLINE, OFFLINE, CONNECTING, DISCONNECTED).
 * @property {HealthStatus} healthStatus - The current health status of the system (HEALTHY, DEGRADED, UNHEALTHY, UNKNOWN).
 * @property {ConnectionStatus} webSocketStatus - The current WebSocket connection status (ONLINE, OFFLINE, CONNECTING, DISCONNECTED).
 */
export interface SystemStatus {
    connectionStatus: ConnectionStatus;
    healthStatus: HealthStatus;
    webSocketStatus: ConnectionStatus;
}

/**
 * Represents static information about the system, including uptime, Node.js version, and environment.
 * @property {number} uptime - The system uptime in seconds.
 * @property {string} nodeVersion - The version of Node.js running the system.
 * @property {string} env - The current environment (e.g., 'development', 'production').
 */
export interface SystemStaticInfo {
    uptime: number;
    nodeVersion: string;
    env: string;
}

/**
 * Represents detailed information about the V8 runtime environment, including process ID, platform, Node.js version, V8 version, libuv version, OpenSSL version, thread pool size, active threads, and startup metrics.
 * @property {number} pid - The process ID of the Node.js process.
 * @property {string} platform - The operating system platform (e.g., 'linux', 'darwin', 'win32').
 * @property {string} nodeVersion - The version of Node.js running the system.
 * @property {string} v8Version - The version of the V8 JavaScript engine.
 * @property {string} libuvVersion - The version of the libuv library used by Node.js.
 * @property {string} openSSLVersion - The version of OpenSSL used by Node.js.
 * @property {number} threadPoolSize - The size of the libuv thread pool.
 * @property {number} activeThreads - The number of active threads in the thread pool.
 * @property {object} startup - An object containing startup metrics, including bootstrap time and required modules count.
 * @property {number} startup.bootstrapTime - The time taken for the Node.js process to bootstrap (in milliseconds).
 * @property {number} startup.requiredModules - The number of modules required during startup.
 */
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