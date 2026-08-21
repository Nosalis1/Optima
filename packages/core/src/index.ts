
export type {
  HttpAdapter,
  RequestRequiredData,
  ResponseRequiredData
} from './adapters/http.adapter';

export type {
  WebSocketAdapter
} from './adapters/websocket.adapter';

export function getHelloMetrics() {
  return "Metrics Pack is greeting you!";
}