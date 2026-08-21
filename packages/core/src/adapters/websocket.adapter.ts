
export interface WebSocketAdapter {
    init(): void;
    broadcast(event: string, data: unknown): void;
    disconnect(): void;
}