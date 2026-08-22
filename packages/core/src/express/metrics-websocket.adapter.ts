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
    WebSocketEvents
} from '../core/delivery';
import { ConfigManager } from '../config';
import Logger from '../core/telemetry/logger';

export class ExpressWebSocketAdapter
    implements WebSocketAdapter {
    private io?: SocketIOServer;

    constructor(
        private readonly server: HTTPServer,
        private readonly provider: MetricsDataProvider
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
            WebSocketEvents.REQUEST_CONFIGURATION,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_CONFIGURATION,
                    ConfigManager.getInstance().get()
                )
            }
        )

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
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_ANALYTICS_DATA,
                    this.provider.getAnalyticsData()
                )
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
        this.io?.close();
        this.io = undefined;
    }
}