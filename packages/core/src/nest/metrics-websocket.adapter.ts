import {
    ConnectedSocket,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';

import type { Server, Socket } from 'socket.io';

import type { WebSocketAdapter } from '../adapters/websocket.adapter';

import { WebSocketEvents } from '../core/delivery';
import Logger from '../core/telemetry/logger';
import type { AnalyticsFilterSettings } from '../core/domain';
import { Inject } from '@nestjs/common';
import type { OptimaRuntimeDependencies } from '../runtime';

@WebSocketGateway({
    transports: ['websocket'],

    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})
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
        payload: { sessionNumber: number },
    ): Promise<void> {
        const { sessionNumber } = payload;

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
        WebSocketEvents.REQUEST_DASHBOARD_DATA,
    )
    handleDashboardData(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_DASHBOARD_DATA,
            this.dependencies.collector.getDashboardData(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_ANALYTICS_DATA,
    )
    handleAnalyticsData(
        @ConnectedSocket() socket: Socket,
        payload: { filters: AnalyticsFilterSettings },
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_ANALYTICS_DATA,
            this.dependencies.collector.getAnalyticsData(payload.filters),
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