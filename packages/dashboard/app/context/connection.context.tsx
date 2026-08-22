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
    REQUEST_CONFIGURATION = "request-configuration",
    RESPONSE_CONFIGURATION = "response-configuration",

    REQUEST_SYSTEM_DATA = "request-system-data",
    RESPONSE_SYSTEM_DATA = "response-system-data",

    REQUEST_DASHBOARD_DATA = "request-dashboard-data",
    RESPONSE_DASHBOARD_DATA = "response-dashboard-data",

    REQUEST_ANALYTICS_DATA = "request-analytics-data",
    RESPONSE_ANALYTICS_DATA = "response-analytics-data",

    REQUEST_HEALTH_DATA = "request-health-data",
    RESPONSE_HEALTH_DATA = "response-health-data",
}

export function ConnectionProvider({
    children
}: { children: React.ReactNode }) {
    const [isConnected, setIsConnected] = React.useState(false);
    const [isConnecting, setIsConnecting] = React.useState(false);

    const [configuration, setConfiguration] = React.useState<ConfigOptions | null>(null);

    const socketRef = React.useRef<Socket | null>(null);

    React.useEffect(() => {
        if (isConnecting || isConnected) return;

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        setIsConnected(false);
        setIsConnecting(true);

        const serverUrl = (typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:3000');

        socketRef.current = io(serverUrl,
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

        socketRef.current.on("connect", () => {
            setIsConnected(true);
            setIsConnecting(false);

            emit(WebSocketEvents.REQUEST_CONFIGURATION, null);
        });

        socketRef.current.on("disconnect", () => {
            setIsConnected(false);
            socketRef.current = null;
        });

        registerEventListener(WebSocketEvents.RESPONSE_CONFIGURATION, (data: ConfigOptions) => {
            setConfiguration(data);
        });

        return () => {
            socketRef.current?.disconnect();
            socketRef.current = null;
            setIsConnected(false);
            setIsConnecting(false);
        };
    }, []);

    function registerEventListener(event: WebSocketEvents, callback: (...args: any[]) => void) {
        socketRef.current?.on(event, callback);
    }

    function unregisterEventListener(event: WebSocketEvents, callback: (...args: any[]) => void) {
        socketRef.current?.off(event, callback);
    }

    function emit(event: WebSocketEvents, data: any) {
        socketRef.current?.emit(event, data);
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