import type {
    Server as HTTPServer
} from 'http';
import {
    Server as SocketIOServer,
    type Socket
} from 'socket.io';

import type {
    WebSocketAdapter
} from '../adapters/websocket.adapter';
import {
    type MetricsDataProvider,
    type SessionDataProvider,
    WebSocketEvents
} from '../core/delivery';
import { ConfigManager } from '../config';
import Logger from '../core/telemetry/logger';

export class ExpressWebSocketAdapter implements WebSocketAdapter {
    private io?: SocketIOServer;
    private isClosed = false;

    constructor(
        private readonly server: HTTPServer,
        private readonly provider: MetricsDataProvider,
        private readonly sessionProvider: SessionDataProvider
    ) { }

    init(): void {
        if (this.io) {
            Logger.debug('WebSocket server is already initialized.');
            return;
        }

        this.io = new SocketIOServer(
            this.server,
            {
                transports: ['polling', 'websocket'],

                path: '/socket.io/',

                maxHttpBufferSize: 1e8, // 100MB

                pingTimeout: 10000, // 10 seconds
                pingInterval: 25000, // 25 seconds

                cors: {
                    origin: true,
                    credentials: true,
                    methods: ['GET', 'POST'],
                },
            },
        );
        this.isClosed = false;
        Logger.debug('WebSocket server initialized successfully.');

        this.setupEvents();
    }

    private setupEvents(): void {
        if (!this.io) return;

        Logger.debug('Setting up WebSocket event bindings.');

        this.io.on(
            'connection',
            socket => {
                Logger.debug(`New WebSocket connection: ${socket.id}`);

                this.setupClient(socket);
            },
        );
    }

    private setupClient(
        socket: Socket
    ): void {

        socket.on(
            WebSocketEvents.REQUEST_SESSION_METADATA,
            async () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_SESSION_METADATA,
                    await this.sessionProvider.getSessionManifest()
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_SESSION_SUMMARY,
            async ({ sessionNumber }) => {
                socket.emit(
                    WebSocketEvents.RESPONSE_SESSION_SUMMARY,
                    await this.sessionProvider.getSessionSummary(sessionNumber)
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_CONFIGURATION,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_CONFIGURATION,
                    ConfigManager.getInstance().get()
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_SYSTEM_DATA,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_SYSTEM_DATA,
                    this.provider.getSystemStaticInfo()
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_DASHBOARD_DATA,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_DASHBOARD_DATA,
                    this.provider.getDashboardData()
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_ANALYTICS_DATA,
            (filters) => {
                if (filters === null) {
                    socket.emit(
                        WebSocketEvents.RESPONSE_ANALYTICS_DATA,
                        this.provider.getAnalyticsData()
                    )
                } else {
                    socket.emit(
                        WebSocketEvents.RESPONSE_FILTERED_ANALYTICS_DATA,
                        this.provider.getAnalyticsData(filters)
                    )
                }
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_HEALTH_DATA,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_HEALTH_DATA,
                    this.provider.getHealthData()
                )
            }
        );

        socket.on(
            'disconnect',
            () => {
                Logger.debug(`WebSocket disconnected: ${socket.id}`);
            }
        );

        socket.emit(WebSocketEvents.RESPONSE_SESSION_METADATA, this.sessionProvider.getSessionManifest());
    }

    broadcast(
        event: string,
        data: unknown
    ): void {
        this.io?.emit(
            event,
            data
        );
    }

    disconnect(): void {
        if (this.isClosed) return;

        this.isClosed = true;

        this.io?.disconnectSockets(true);
        this.io?.close();

        this.io = undefined;
    }
}