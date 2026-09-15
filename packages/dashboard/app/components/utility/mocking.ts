import type {
    AnalyticsData,
    DashboardData,
    HealthData,
    SessionMetadata,
    SessionSummary,
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

export function mockSessionData(): SessionMetadata[] {
    return [
        { sessionNumber: 1, recoveredFromCrash: false, startedAt: "2024-06-01 10:00:00", endedAt: "2024-06-01 10:30:00" },
        { sessionNumber: 2, recoveredFromCrash: true, startedAt: "2024-06-02 11:00:00", endedAt: null },
        { sessionNumber: 3, recoveredFromCrash: false, startedAt: "2024-06-03 12:00:00", endedAt: null },
        { sessionNumber: 4, recoveredFromCrash: false, startedAt: "2024-06-04 13:00:00", endedAt: null },
        { sessionNumber: 5, recoveredFromCrash: true, startedAt: "2024-06-05 14:00:00", endedAt: null },
        { sessionNumber: 6, recoveredFromCrash: false, startedAt: "2024-06-06 15:00:00", endedAt: null },
        { sessionNumber: 7, recoveredFromCrash: false, startedAt: "2024-06-07 16:00:00", endedAt: "2024-06-07 17:00:00" },
        { sessionNumber: 8, recoveredFromCrash: true, startedAt: "2024-06-08 17:00:00", endedAt: null },
        { sessionNumber: 9, recoveredFromCrash: false, startedAt: "2024-06-09 18:00:00", endedAt: null },
        { sessionNumber: 10, recoveredFromCrash: false, startedAt: "2024-06-10 19:00:00", endedAt: null }
    ];
}

export function mockSessionSummary(sessionNumber: number): SessionSummary {
    function generateDummyHours(count: number): SessionSummary["perHour"] {
        const hours: SessionSummary["perHour"] = [];
        const now = new Date();
        for (let i = 0; i < count; i++) {
            const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
            const clientErrorCount = Math.floor(Math.random() * 10);
            const serverErrorCount = Math.floor(Math.random() * 5);
            const min = Math.max(clientErrorCount, serverErrorCount) + 1;
            const avgRps = min + Math.floor(Math.random() * 100);
            const latency = Math.random() * 220;
            const ec = Math.floor(Math.random() * 10);
            hours.push({
                hourStart: hourStart.toISOString(),
                clientErrorCount: clientErrorCount,
                serverErrorCount: serverErrorCount,
                avgRps: avgRps,
                maxRps: avgRps + Math.floor(Math.random() * 50),
                avgLatency: latency,
                maxLatency: latency + Math.random() * 250,
                healthyEndpointCount: ec + Math.floor(Math.random() * 10),
                slowEndpointCount: ec + Math.floor(Math.random() * 5),
                sampleCount: Math.floor(Math.random() * 1000)
            });
        }
        return hours;
    }

    return {
        sessionNumber: sessionNumber,
        startedAt: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
        endedAt: new Date().toISOString(),
        windowStart: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(),
        windowEnd: new Date().toISOString(),
        clientErrorCount: 214,
        serverErrorCount: 164,
        avgRps: 110,
        maxRps: 220,
        avgLatency: 250,
        maxLatency: 500,
        sampleCount: 10000,
        perHour: generateDummyHours(24)
    }
}