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
import { collectorService } from '../core/telemetry/collector.service';
import { persistence } from '../core/storage';
import Logger from '../core/telemetry/logger';

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
            await persistence.getSessionManifest(),
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
            persistence.getSessionManifest(),
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

        const summary = await persistence.getSessionSummary(sessionNumber);

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
            collectorService.getSystemStaticInfo(),
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
            collectorService.getDashboardData(),
        );
    }

    @SubscribeMessage(
        WebSocketEvents.REQUEST_ANALYTICS_DATA,
    )
    handleAnalyticsData(
        @ConnectedSocket() socket: Socket,
    ): void {
        socket.emit(
            WebSocketEvents.RESPONSE_ANALYTICS_DATA,
            collectorService.getAnalyticsData(),
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
            collectorService.getHealthData(),
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
        this.server?.disconnectSockets(true);
    }
}