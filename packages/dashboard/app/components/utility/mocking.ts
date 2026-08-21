import type {
    AnalyticsData,
    DashboardData,
    HealthData,
} from '../../domain';

const mock = (min: number, max: number): number => {
    return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

const mockArray = (length: number, min: number, max: number): number[] => {
    return Array.from({ length }, () => mock(min, max));
}

const ARRAY_LENGTH = 30; // Number of data points for history arrays

export function mockDashboardData(): DashboardData {
    return {
        // Current instantaneous values
        current: {
            rps: mock(200, 340000),
            latency: mock(100, 500),
            errorRate: mock(0, 0.1),
            eventLoopLag: mock(0, 100),
            heapUsage: mock(50, 200),
            heapSize: mock(100, 500),
        },

        // Stream history arrays
        history: {
            rps: mockArray(ARRAY_LENGTH, 50, 200),
            latency: mockArray(ARRAY_LENGTH, 100, 500),
            errorRate: mockArray(ARRAY_LENGTH, 0, 0.1),
            eventLoopLag: mockArray(ARRAY_LENGTH, 0, 100),
            heapUsage: mockArray(ARRAY_LENGTH, 50, 200),
            heapSize: mockArray(ARRAY_LENGTH, 100, 500),
            rssMemory: mockArray(ARRAY_LENGTH, 0, 1000),
            totalHeap: mockArray(ARRAY_LENGTH, 0, 1000), // From health memory breakdown
            p95: mockArray(ARRAY_LENGTH, 0, 100),
            p99: mockArray(ARRAY_LENGTH, 0, 100),
        },
        impactEndpoints: [
            {
                method: 'GET',
                route: '/api/v1/users',
                rps: mock(50, 200),
                p95: mock(100, 500),
                p99: mock(0, 100),
                errorRate: mock(0, 0.1),
                status: 'OK',
                requestCount: mock(1000, 5000),
                averageLatency: mock(100, 500),
            },
            {
                method: 'POST',
                route: '/api/v1/orders',
                rps: mock(50, 200),
                p95: mock(100, 500),
                p99: mock(0, 100),
                errorRate: mock(0, 0.1),
                status: 'OK',
                requestCount: mock(1000, 5000),
                averageLatency: mock(100, 500),
            }
        ],
        alerts: [
            {
                title: 'High error rate detected',
                timestamp: new Date().toISOString(),
                severity: 'warning',
            },
            {
                title: 'Latency spike detected',
                timestamp: new Date().toISOString(),
                severity: 'critical',
            },
            {
                title: 'New endpoint added',
                timestamp: new Date().toISOString(),
                severity: 'info',
            },
            {
                title: 'Server memory usage high',
                timestamp: new Date().toISOString(),
                severity: 'advisory',
            }
        ],

        // Explicit chart configuration maps matching chart configurations directly
        charts: {
            throughput: {
                rps: mockArray(ARRAY_LENGTH, 50, 200),
                errorClient: mockArray(ARRAY_LENGTH, 0, 100),
                errorServer: mockArray(ARRAY_LENGTH, 0, 100),
                totalCount: mock(1000, 5000),
            },
            percentiles: {
                p50: mockArray(ARRAY_LENGTH, 0, 100),
                p95: mockArray(ARRAY_LENGTH, 0, 100),
                p99: mockArray(ARRAY_LENGTH, 0, 100),
                totalCount: mock(1000, 5000),
            },
            runtimePerformance: {
                heapUsage: mockArray(ARRAY_LENGTH, 50, 200),
                heapSize: mockArray(ARRAY_LENGTH, 100, 500),
                lag: mockArray(ARRAY_LENGTH, 0, 100),
                totalCount: mock(1000, 5000),
            },
        }
    }
}

export function mockAnalyticsData(): AnalyticsData {
    return {
        summary: {
            totalEndpoints: mock(10, 50),
            healthyEndpoints: mock(5, 25),
            slowEndpoints: mock(0, 5),
            slowEndpointsThreshold: parseFloat(mock(100, 500).toFixed(0)),
            errorEndpoints: mock(0, 5),
        },
        latencyDistribution: [
            {
                endpoint: "endpoint1",
                p50: mock(0, 100),
                p95: mock(0, 100),
                p99: mock(0, 100),
            },
            {
                endpoint: "endpoint2",
                p50: mock(0, 100),
                p95: mock(0, 100),
                p99: mock(0, 100),
            },
            {
                endpoint: "endpoint3",
                p50: mock(0, 100),
                p95: mock(0, 100),
                p99: mock(0, 100),
            }
        ],
        requestVolume: [
            // {
            //     endpoint: "endpoint1",
            //     volume: mock(0, 1000),
            // },
            // {
            //     endpoint: "endpoint2",
            //     volume: mock(0, 1000),
            // },
            // {
            //     endpoint: "endpoint3",
            //     volume: mock(0, 1000),
            // }
        ],
        history: [],
        endpointsTable: {
            data: [
                {
                    method: "endpoint1",
                    route: "/api/v1/endpoint1",
                    rps: mock(0, 100),
                    p95: mock(0, 100),
                    p99: mock(0, 100),
                    errorRate: mock(0, 100),
                    status: "healthy",
                    requestCount: mock(1000, 8000),
                    averageLatency: mock(0, 100),
                },
                {
                    method: "endpoint2",
                    route: "/api/v1/endpoint2",
                    rps: mock(0, 100),
                    p95: mock(0, 100),
                    p99: mock(0, 100),
                    errorRate: mock(0, 100),
                    status: "healthy",
                    requestCount: mock(0, 1000),
                    averageLatency: mock(0, 100),
                }
            ],
            pagination: {
                page: 1,
                pageSize: 10,
                perPageCount: 2,
                totalCount: 2,
            }
        }
    }
}

export function mockHealthData(): HealthData {
    return {
        cpu: {
            usageRate: 12.5,
            numberOfCores: 8,
            perCoreUsage: mockArray(ARRAY_LENGTH, 0, 100),
            userUsage: 12.5,
            systemUsage: 40,
            idleUsage: 100 - 52.5,
        },
        memory: {
            heapUsage: mock(0, 1000),
            heapSize: 1000,
            rssMemory: mock(0, 16000),
            rssMemoryTotal: 16000,
            externalMemory: mock(0, 1000),
        },
        eventLoop: {
            lag: mock(0, 200),
            threshold: 200,
        },
        handles: {
            activeHandles: mock(0, 100),
            activeHandlesTimers: mock(0, 100),
            activeHandlesSockets: mock(0, 100),
            activeLibuvHandles: mock(0, 100),
            timers: mock(0, 100),
            fileDescriptors: mock(0, 100),
        },
        garbageCollection: {
            gcCount: mock(0, 100),
            gcTime: mock(0, 1000),
            gcPauseAverage: mock(0, 100),
            minorGC: {
                runCount: mock(0, 100),
                averageTime: mock(0, 100),
            },
            majorGC: {
                runCount: mock(0, 100),
                averageTime: mock(0, 100),
            },
            incrementalGC: {
                runCount: mock(0, 100),
                averageTime: mock(0, 100),
            },
            heapSpaces: [],
            gcTotals: {
                totalPauseTime: mock(0, 1000),
                freedMemory: mock(0, 1000),
                promotions: mock(0, 100),
                tenuredSize: mock(0, 100),
            },
        },
        runtime: {
            pid: mock(1000, 10000),
            platform: "linux",
            nodeVersion: "14.15.0",
            v8Version: "8.1.381.32",
            libuvVersion: "1.40.0",
            openSSLVersion: "1.1.1j",
            threadPoolSize: mock(1, 16),
            activeThreads: mock(1, 16),
            startup: {
                bootstrapTime: mock(0, 1000),
                requiredModules: mock(0, 100),
            },
        },
        history: {
            eventLoopLag: mockArray(ARRAY_LENGTH, 0, 100),
            memoryBreakdown: {
                usedHeap: mockArray(ARRAY_LENGTH, 0, 1000),
                totalHeap: mockArray(ARRAY_LENGTH, 0, 1000),
                rssMemory: mockArray(ARRAY_LENGTH, 0, 1000),
            }
        }
    }
}