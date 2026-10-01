"use client";
import React from 'react';
import { io, Socket } from "socket.io-client";
import Loading from '../components/utility/loading';
import type { ConfigOptions } from '../domain/config.types';

const ConnectionContext = React.createContext<{
    isConnected: boolean;
    isConnecting: boolean;

    registerEventListener: (event: WebSocketEvents, callback: (...args: any[]) => void) => void;
    unregisterEventListener: (event: WebSocketEvents, callback: (...args: any[]) => void) => void;
    emit: (event: WebSocketEvents, data: any) => void;

    configuration: ConfigOptions | null;
} | null>(null);

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

export function ConnectionProvider({
    children
}: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isConnecting, setIsConnecting] = React.useState(true);

    const [configuration, setConfiguration] = React.useState<ConfigOptions | null>(null);

    const socketRef = React.useRef<Socket | null>(null);

    React.useEffect(() => {
        const serverUrl = (typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:3000');

        const socket = io(serverUrl,
            {
                path: '/socket.io/',
                transports: ["polling", "websocket"],
                reconnection: true,
                reconnectionAttempts: Infinity,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                autoConnect: true,
                timeout: 20000,
            }
        );
        socketRef.current = socket;

        const onConfiguration = (data: ConfigOptions) => setConfiguration(data);
        socket.on(WebSocketEvents.RESPONSE_CONFIGURATION, onConfiguration);

        socket.on("connect", () => {
            setIsConnected(true);
            setIsConnecting(false);
            socket.emit(WebSocketEvents.REQUEST_CONFIGURATION, null);
        });

        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        return () => {
            socket.removeAllListeners();
            socket.disconnect();
            if (socketRef.current === socket) socketRef.current = null;
            setIsConnected(false);
            setIsConnecting(false);
        };
    }, []);

    function emit(event: WebSocketEvents, data: any) {
        if (!socketRef.current?.connected) return;
        socketRef.current.emit(event, data);
    }

    function registerEventListener(event: WebSocketEvents, callback: (...args: any[]) => void) {
        socketRef.current?.on(event, callback);
    }

    function unregisterEventListener(event: WebSocketEvents, callback: (...args: any[]) => void) {
        socketRef.current?.off(event, callback);
    }


    return (
        <ConnectionContext.Provider value={{
            isConnected,
            isConnecting,
            registerEventListener,
            unregisterEventListener,
            emit,
            configuration
        }}>
            {
                (isConnecting)
                    ? <Loading text={"Connecting..."} />
                    : children
            }
        </ConnectionContext.Provider>
    );
}

export function useConnection() {
    const context = React.useContext(ConnectionContext);
    if (!context) {
        throw new Error('useConnection must be used within a ConnectionProvider');
    }
    return context;
}