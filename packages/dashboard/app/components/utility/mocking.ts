import type {
    AnalyticsData,
    CorrelationData,
    DashboardData,
    HealthDetails,
    SessionRecord,
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

        timeline: Array.from({ length: ARRAY_LENGTH }, (_, i) => i - ARRAY_LENGTH + 1),

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
        impactEndpoints: [],
        endpointsTable: {
            data: [
                {
                    method: "endpoint1",
                    route: "/api/v1/endpoint1",
                    rps: mock(0, 100),
                    p50: mock(0, 100),
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
                    p50: mock(0, 100),
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

export function mockHealthDetails(): HealthDetails {
    return {
        cpu: {
            numberOfCores: 8,
            perCoreUsage: mockArray(ARRAY_LENGTH, 0, 100),
        },
        memory: {
            rssMemoryTotal: 16000,
            externalMemory: mock(0, 1000),
        },
        eventLoop: {
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
        }
    }
}

export function mockSessionData(): SessionRecord[] {
    return [];
}

export function mockCorrelationData(): CorrelationData {
    return {
        results: [
            {
                id: '1',
                xLabel: 'CPU Usage',
                yLabel: 'Heap Usage',
                expectedDirection: 'POSITIVE',
                unexpectedDirection: false,
                analysis: {
                    status: 'STRONG_LINEAR_ASSOCIATION',
                    direction: 'POSITIVE',
                    pearsonR: 0.85,
                    spearmanR: 0.82,
                    rawPearsonR: 0.85,
                    differencePearsonR: 0.03,
                    determination: 0.72,
                    lag: 0,
                    laggedPearsonR: 0.85,
                    sampleSize: 100,
                    effectiveSampleSize: 95,
                    requiredSampleSize: 80,
                    autocorrelationX: 0.1,
                    autocorrelationY: 0.15,
                    trendDriven: false,
                    recommendation: 'Monitor CPU and Heap usage closely for potential performance issues.'
                }
            }
        ],
        assessment: {
            status: 'POSSIBLE_SATURATION',
            evidence: [
                'Strong positive correlation between CPU usage and Heap usage.',
                'High determination coefficient indicates a significant relationship.'
            ],
            recommendation: 'Investigate the application\'s memory management and optimize resource usage to prevent potential saturation.'
        }
    }
}