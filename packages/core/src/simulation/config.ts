export type Method =
    | "GET"
    | "POST"
    | "PUT"
    | "PATCH"
    | "DELETE";

export interface EndpointLatency {
    normal: number;
    p95: number;
    p99: number;
}

export interface EndpointErrors {
    client: number;
    server: number;
}

export interface EndpointConfig {
    url: string;
    methods: Method[];
    weight: number;
    latency: EndpointLatency;
    errors: EndpointErrors;
    service:
    | "USER"
    | "ORDER"
    | "PRODUCT"
    | "AUTH"
    | "SYSTEM";
}

export const endpoints: EndpointConfig[] = [
    {
        url: "/api/users",
        methods: ["GET", "POST", "PATCH"],
        weight: 35,
        latency: { normal: 25, p95: 120, p99: 500 },
        errors: { client: 0.01, server: 0.005 },
        service: "USER",
    },
    {
        url: "/api/orders",
        methods: ["GET", "POST", "PATCH"],
        weight: 25,
        latency: { normal: 80, p95: 350, p99: 700 },
        errors: { client: 0.01, server: 0.01 },
        service: "ORDER",
    },
    {
        url: "/api/products",
        methods: ["GET"],
        weight: 20,
        latency: { normal: 15, p95: 80, p99: 250 },
        errors: { client: 0.005, server: 0.002 },
        service: "PRODUCT",
    },
    {
        url: "/api/auth/login",
        methods: ["POST"],
        weight: 10,
        latency: { normal: 120, p95: 400, p99: 900 },
        errors: { client: 0.02, server: 0.01 },
        service: "AUTH",
    },
    {
        url: "/health",
        methods: ["GET"],
        weight: 7,
        latency: { normal: 3, p95: 10, p99: 20 },
        errors: { client: 0, server: 0 },
        service: "SYSTEM",
    },
    {
        url: "/metrics",
        methods: ["GET"],
        weight: 3,
        latency: { normal: 5, p95: 20, p99: 50 },
        errors: { client: 0, server: 0 },
        service: "SYSTEM",
    },
];

export const TOTAL_WEIGHT =
    endpoints.reduce(
        (sum, e) => sum + e.weight,
        0
    );