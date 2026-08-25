export interface RequestResult {
    success: boolean;
    statusCode: number;
    durationMs: number;
}

export async function request(
    url: string,
    options?: RequestInit,
): Promise<RequestResult> {
    const start = performance.now();

    try {
        const response = await fetch(url, options);
        const durationMs = performance.now() - start;

        await response.arrayBuffer();

        return {
            success: response.ok,
            statusCode: response.status,
            durationMs,
        };
    } catch (error) {
        return {
            success: false,
            statusCode: 0,
            durationMs: performance.now() - start,
        }
    }
}