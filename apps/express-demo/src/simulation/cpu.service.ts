export class CpuService {
    simulateHeavyCalculation(
        durationMs: number,
    ) {
        const start = Date.now();

        let result = 0;

        while (
            Date.now() - start < durationMs
        ) {
            result += Math.sqrt(
                Math.random() * 1_000_000,
            );
        }

        return result;
    }
}