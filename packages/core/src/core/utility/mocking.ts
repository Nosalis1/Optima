export function mockArray(
    length: number,
    min: number,
    max: number,
    force?: number
): number[] {
    const arr = [];
    for (let i = 0; i < length; i++) {
        if (force !== undefined) {
            if (Math.random() < 0.7) {
                arr.push(force);
                continue;
            }
        }
        arr.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }
    return arr;
}

export function mockDistributionEntry(
    endpoint: string,
    p50Min: number,
    p50Max: number,
    p95Min: number,
    p95Max: number,
    p99Min: number,
    p99Max: number
): {
    endpoint: string;
    p50: number;
    p95: number;
    p99: number;
} {
    return {
        endpoint,
        p50: Math.floor(Math.random() * (p50Max - p50Min + 1)) + p50Min,
        p95: Math.floor(Math.random() * (p95Max - p95Min + 1)) + p95Min,
        p99: Math.floor(Math.random() * (p99Max - p99Min + 1)) + p99Min,
    };
}

export function mockDistribution(
    endpoints: string[],
    p50Min: number,
    p50Max: number,
    p95Min: number,
    p95Max: number,
    p99Min: number,
    p99Max: number
): {
    endpoint: string;
    p50: number;
    p95: number;
    p99: number;
}[] {
    return endpoints.map((endpoint) => mockDistributionEntry(endpoint, p50Min, p50Max, p95Min, p95Max, p99Min, p99Max));
}

export function mockVolumeEntry(
    endpoint: string,
    volumeMin: number,
    volumeMax: number
): {
    endpoint: string;
    volume: number;
} {
    return {
        endpoint,
        volume: Math.floor(Math.random() * (volumeMax - volumeMin + 1)) + volumeMin,
    };
}

export function mockVolume(
    endpoints: string[],
    volumeMin: number,
    volumeMax: number
): {
    endpoint: string;
    volume: number;
}[] {
    return endpoints.map((endpoint) => mockVolumeEntry(endpoint, volumeMin, volumeMax));
}