import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import type { Server, Socket } from 'socket.io';

import type { WebSocketAdapter } from '../adapters/websocket.adapter';

import { WebSocketEvents, parseBucketsRequest } from '../core/delivery';
import Logger from '../core/telemetry/logger';
import type { AnalyticsFilterSettings } from '../core/domain';
import { Inject } from '@nestjs/common';
import type { OptimaRuntimeDependencies } from '../runtime';
import { DEFAULT_CONFIG, toClientConfig } from '../config';
import { socketServerOptions } from '../adapters/socket.options';

@WebSocketGateway(socketServerOptions(DEFAULT_CONFIG.transport))
export class NestWebSocketAdapter
    implements
    WebSocketAdapter,
    OnGatewayConnection,
    OnGatewayDisconnect {
    @WebSocketServer()
    private server!: Server;

    constructor(
        @Inject('OPTIMA_RUNTIME_DEPENDENCIES')
        private readonly dependencies: OptimaRuntimeDependencies,
    ) { }

    init(): void { }

    async handleConnection(
        socket: Socket,
    ): Promise<void> {
        Logger.debug(
            'Dashboard client connected.',
            socket.id,
        );

        socket.emit(
            WebSocketEvents.RESPONSE_SESSION_METADATA,
            await this.dependencies.persistence.getSessionManifest(),
        );
    }

    handleDisconnect(
        socket: Socket,
    ): void {
        Logger.debug(
            'Dashboard client disconnected.',
            socket.id,
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_SESSION_METADATA,
    )
    handleSessionMetadata(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_SESSION_METADATA,
            this.dependencies.persistence.getSessionManifest(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_SESSION_SUMMARY,
    )
    async handleSessionSummary(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { sessionNumber: number },
    ): Promise<void> {
        const sessionNumber = Number(payload?.sessionNumber);

        const summary = await this.dependencies.persistence.getSessionSummary(sessionNumber);

        socket.emit(
            WebSocketEvents.RESPONSE_SESSION_SUMMARY,
            summary,
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_SYSTEM_DATA,
    )
    handleSystemData(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_SYSTEM_DATA,
            this.dependencies.collector.getSystemStaticInfo(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_ANALYTICS_DATA,
    )
    handleAnalyticsData(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { filters: AnalyticsFilterSettings },
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_ANALYTICS_DATA,
            this.dependencies.collector.getAnalyticsData(payload?.filters ?? undefined),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_HEALTH_DATA,
    )
    handleHealthData(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_HEALTH_DATA,
            this.dependencies.collector.getHealthData(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_CORRELATION_DATA,
    )
    handleCorrelationData(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_CORRELATION_DATA,
            this.dependencies.correlation.pack(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_CONFIGURATION,
    )
    handleConfiguration(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_CONFIGURATION,
            toClientConfig(this.dependencies.config),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_INCIDENTS,
    )
    handleIncidents(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_INCIDENTS,
            this.dependencies.incidents.snapshot(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_DASHBOARD_BUCKETS,
    )
    async handleDashboardBuckets(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: unknown,
    ): Promise<void> {
        const req = parseBucketsRequest(payload);
        if (!req) return;
        try {
            socket.emit(
                WebSocketEvents.RESPONSE_DASHBOARD_BUCKETS,
                await this.dependencies.dashboard.getBackFill(req),
            );
        } catch (err) {
            Logger.error('Dashboard backfill failed:', err);
        }
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_CORRELATION_REPLAY,
    )
    async handleCorrelationReplay(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { findingId: string },
    ): Promise<void> {
        const findingId = String(payload?.findingId);
        socket.emit(
            WebSocketEvents.RESPONSE_CORRELATION_REPLAY,
            { findingId, outcome: await this.dependencies.correlation.replay(findingId) },
        );
    }

    broadcast(
        event: string,
        data: unknown,
    ): void {
        this.server.emit(
            event,
            data,
        );
    }

    disconnect(): void {
        if (!this.server) return;
        this.server?.disconnectSockets(true);
    }
}