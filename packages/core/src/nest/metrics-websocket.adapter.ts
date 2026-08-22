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

    handleConnection(
        socket: Socket,
    ): void {
        Logger.debug(
            'Dashboard client connected.',
            socket.id,
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