import { storage } from "../core/storage/local.repository";
import type {
    TelemetryRequest
} from "../core/domain";
import {
    EndpointConfig,
    endpoints,
} from './config';
import {
    scenario,
    updateScenarios,
} from './scenarios';
import { pickJourney } from './journey';
import {
    probability,
    random,
    randomIp,
} from './utility';


function generateLatency(endpoint: EndpointConfig) {
    const r = Math.random();

    // 90% normal traffic
    if (r < 0.90) {
        return random(
            endpoint.latency.normal * 0.7,
            endpoint.latency.normal * 1.3
        );
    }

    // p95 range
    if (r < 0.99) {
        return random(
            endpoint.latency.normal,
            endpoint.latency.p95
        );
    }

    // p99 tail
    return random(
        endpoint.latency.p95,
        endpoint.latency.p99
    );
}

function applyDependencies(endpoint: EndpointConfig, latency: number, status: number) {
    const now = Date.now();
    // Database affects users and orders
    if (now < scenario.databaseSlowUntil && (endpoint.service === "USER" || endpoint.service === "ORDER")) {
        latency *= random(2, 3);
        if (probability(0.1)) {
            status = 503;
        }
    }

    // Auth outage
    if (now < scenario.authDownUntil && (endpoint.service === "AUTH" || endpoint.service === "ORDER")) {
        latency *= random(2, 3);
        if (endpoint.service === "AUTH") {
            status = 401;
        } else {
            status = 503;
        }
    }

    // Global latency spike
    if (now < scenario.latencySpikeUntil) {
        latency *= random(2, 3);
    }

    return { latency, status };
}

function generateStatus(endpoint: EndpointConfig): number {
    const r = Math.random();
    // client errors
    if (r < endpoint.errors.client) {
        return random(400, 499);
    }

    // server errors
    if (r < endpoint.errors.client + endpoint.errors.server) {
        return random(500, 599);
    }

    return 200;
}

function findEndpoint(url: string) {
    return endpoints.find(e => e.url === url) ?? endpoints[0];
}

function createRequest(): TelemetryRequest {
    updateScenarios();

    const journey = pickJourney();
    const url = journey.endpoints[random(0, journey.endpoints.length - 1)];
    const endpoint = findEndpoint(url);
    const method = endpoint.methods[random(0, endpoint.methods.length - 1)];
    let latency = generateLatency(endpoint);
    let status = generateStatus(endpoint);

    // apply service failures
    const result = applyDependencies(endpoint, latency, status);
    latency = result.latency;
    status = result.status;

    // memory leak simulation
    // increases response time slowly
    if (scenario.memoryLeak) {
        latency *= random(1, 2);
    }

    return {
        timestamp: Date.now(),
        endpoint: endpoint.url,
        method,
        statusCode: status,
        responseTime: Math.round(latency),
        clientIp: randomIp(),
    };
}

function generateStableLatency(endpoint: EndpointConfig): number {
    // 2% chance of a spike in latency, simulating a rare event
    if (random(0, 1) < 0.02) {
        return random(
            endpoint.latency.normal * 5,
            endpoint.latency.normal * 8.5
        );
    }

    return random(
        endpoint.latency.normal * 0.85,
        endpoint.latency.normal * 1.15
    );
}
function createStableRequest(): TelemetryRequest {
    const journey = pickJourney();
    const url = journey.endpoints[random(0, journey.endpoints.length - 1)];
    const endpoint = endpoints.find(e => e.url === url) ?? endpoints[0];
    const method = endpoint.methods[random(0, endpoint.methods.length - 1)];

    const latency = generateStableLatency(endpoint);

    return {
        timestamp: Date.now(),
        endpoint: endpoint.url,
        method,
        statusCode: 200,
        responseTime: Math.round(latency),
        clientIp: randomIp(),
    };
}

const IS_STABLE = true;

export class TrafficSimulator {
    private timer?: NodeJS.Timeout;
    private running = false;

    constructor(
        private readonly repository = storage
    ) { }

    start(options?: { intervalMs?: number; requestsPerTick?: number; }) {
        if (this.running) {
            return;
        }

        this.running = true;

        const interval = options?.intervalMs ?? 100;
        const baseRequests = options?.requestsPerTick ?? 20;

        console.log("Traffic simulation started!");

        this.timer = setInterval(() => {
            if (IS_STABLE) {
                const request = createStableRequest();
                this.repository.record(request);
            } else {
                const multiplier = scenario.trafficMultiplier;

                const amount = Math.floor(baseRequests * multiplier);

                for (let i = 0; i < amount; i++) {
                    const request = createRequest();
                    this.repository.record(request);
                }
            }
        }, interval);
    }

    stop() {
        if (!this.timer) {
            return;
        }

        clearInterval(this.timer);

        this.timer = undefined;

        this.running = false;

        console.log("Traffic simulation stopped!");
    }

    isRunning() {
        return this.running;
    }
}