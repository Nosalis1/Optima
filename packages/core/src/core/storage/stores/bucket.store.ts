import type {
    EndpointTelemetry,
} from '../../domain';
import {
    RingBuffer
} from "../utility";
import {
    HealthStore
} from "../stores/health.store";
import type {
    EndpointStore
} from "../stores/endpoint.store";
import type {
    MetricsStore
} from "../stores/metrics.store";

export interface TelemetryBucket {
    timestamp: number;
    rps: {
        count: number;
        perEndpoints: Map<string, number>;
    };
    latency: {
        average: number;
        p50: number;
        p95: number;
        p99: number;
    };
    error: {
        rate: number;
        clientCount: number;
        serverCount: number;
    };
    endpoints: EndpointTelemetry[];
    health: ReturnType<HealthStore["get"]>;
}

export class BucketStore {
    private readonly history: RingBuffer<TelemetryBucket>;

    private currentSecond: number;
    private requestCount: number;
    private endpointRequests: Map<string, number>;

    constructor(
        private readonly endpointStore: EndpointStore,
        private readonly healthStore: HealthStore,
        private readonly metricsStore: MetricsStore,
        bufferSize: number = 60
    ) {
        this.history = new RingBuffer<TelemetryBucket>(bufferSize);
        this.currentSecond = this.getSecond();
        this.requestCount = 0;
        this.endpointRequests = new Map<string, number>();
    }

    recordRequest(
        method: string,
        route: string
    ): void {
        this.requestCount++;
        const key = `${method}:${route}`;
        const count = this.endpointRequests.get(key) ?? 0;
        this.endpointRequests.set(key, count + 1);
    }

    flush(): void {
        const now = this.getSecond();

        // same second
        if (now === this.currentSecond) {
            return;
        }

        const endpoints = this.endpointStore.all();

        const metrics = this.metricsStore.snapshot();

        const bucket: TelemetryBucket = {
            timestamp: this.currentSecond,
            rps: {
                count: this.requestCount,
                perEndpoints: new Map(this.endpointRequests),
            },

            latency: {
                average: metrics.averageLatency,
                p50: metrics.latency.p50,
                p95: metrics.latency.p95,
                p99: metrics.latency.p99,
            },

            error: {
                rate: metrics.errorRate,
                clientCount: metrics.errorClientCount,
                serverCount: metrics.errorServerCount,
            },

            endpoints,

            health: this.healthStore.get(),
        };

        this.history.push(bucket);

        this.reset();
        this.metricsStore.reset();

        this.currentSecond = now;
    }

    getHistory(): TelemetryBucket[] {
        return this.history.values();
    }

    latest(): TelemetryBucket | undefined {
        return this.history.latest();
    }

    private reset() {
        this.requestCount = 0;
        this.endpointRequests.clear();
    }

    private getSecond(): number {
        return (Math.floor(Date.now() / 1000) * 1000);
    }
}