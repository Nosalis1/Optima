import type { ServerOptions } from 'socket.io';
import type { ReadonlyConfig } from '../config';

export function socketServerOptions(transport: ReadonlyConfig['transport']): Partial<ServerOptions> {
    return {
        path: transport.socketPath,
        transports: ['polling', 'websocket'],
        pingTimeout: transport.pingTimeoutMs,
        maxHttpBufferSize: transport.maxHttpBufferSize,
        cors: {
            origin: transport.cors === '*' ? true : transport.cors,
            credentials: true,
            methods: ['GET', 'POST'],
        },
    };
}
