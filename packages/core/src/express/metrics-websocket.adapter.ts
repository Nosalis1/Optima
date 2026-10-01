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
    type CorrelationDataProvider,
    type IncidentDataProvider,
    type MetricsDataProvider,
    type SessionDataProvider,
    WebSocketEvents,
    parseBucketsRequest
} from '../core/delivery';
import { toClientConfig, type ReadonlyConfig } from '../config';
import { socketServerOptions } from '../adapters/socket.options';
import Logger from '../core/telemetry/logger';

export class ExpressWebSocketAdapter implements WebSocketAdapter {
    private io?: SocketIOServer;
    private isClosed = false;

    constructor(
        private readonly server: HTTPServer,
        private readonly provider: MetricsDataProvider,
        private readonly sessionProvider: SessionDataProvider,
        private readonly correlationProvider: CorrelationDataProvider,
        private readonly incidentProvider: IncidentDataProvider,
        private readonly config: ReadonlyConfig
    ) { }

    init(): void {
        if (this.io) {
            Logger.debug('WebSocket server is already initialized.');
            return;
        }

        this.io = new SocketIOServer(this.server, socketServerOptions(this.config.transport));
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
                    toClientConfig(this.config)
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
            WebSocketEvents.REQUEST_CORRELATION_DATA,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_CORRELATION_DATA,
                    this.correlationProvider.pack()
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_INCIDENTS,
            () => {
                socket.emit(
                    WebSocketEvents.RESPONSE_INCIDENTS,
                    this.incidentProvider.snapshot()
                )
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_DASHBOARD_BUCKETS,
            async (raw: unknown) => {
                const req = parseBucketsRequest(raw);
                if (!req) return;
                try {
                    socket.emit(WebSocketEvents.RESPONSE_DASHBOARD_BUCKETS, await this.provider.getBackFill(req));
                } catch (err) {
                    Logger.error('Dashboard backfill failed:', err);
                }
            }
        );

        socket.on(
            WebSocketEvents.REQUEST_CORRELATION_REPLAY,
            async ({ findingId }: { findingId: string }) => {
                socket.emit(
                    WebSocketEvents.RESPONSE_CORRELATION_REPLAY,
                    { findingId, outcome: await this.correlationProvider.replay(String(findingId)) }
                )
            }
        );

        socket.on(
            'disconnect',
            () => {
                Logger.debug(`WebSocket disconnected: ${socket.id}`);
            }
        );

        void this.sessionProvider.getSessionManifest().then(manifest =>
            socket.emit(WebSocketEvents.RESPONSE_SESSION_METADATA, manifest));
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