import { expect, describe, test } from '@jest/globals';
import { Histogram, getBucketTolerance } from "./histogram";

describe("Histogram", () => {
    test("should add values and compute histogram correctly", () => {
        const histogram = new Histogram(5);
        histogram.record(1);
        histogram.record(2);
        histogram.record(3);
        histogram.record(4);
        histogram.record(5);
        histogram.record(6);

        const snapshot = histogram.snapshot();

        expect(snapshot.count).toBe(6);
        expect(snapshot.sum).toBe(21);
        expect(snapshot.average).toBeCloseTo(3.5);
        expect(snapshot.sumOfSquares).toBe(91);
        expect(snapshot.anomalyCount).toBe(0);
    });

    test("should reset histogram correctly", () => {
        const histogram = new Histogram();
        histogram.record(1);
        histogram.record(2);
        histogram.reset();

        const snapshot = histogram.snapshot();
        expect(snapshot.count).toBe(0);
        expect(snapshot.sum).toBe(0);
        expect(snapshot.average).toBe(0);
        expect(snapshot.sumOfSquares).toBe(0);
        expect(snapshot.p50).toBe(0);
        expect(snapshot.p95).toBe(0);
        expect(snapshot.p99).toBe(0);
        expect(snapshot.anomalyCount).toBe(0);
    });

    test('should calculate percentiles correctly', () => {
        const histogram = new Histogram();

        const values = [250, 332, 127, 257, 551, 323, 567];
        values.forEach(value => histogram.record(value));

        const snapshot = histogram.snapshot();

        const approximate = (value: number, expected: number) => {
            expect(Math.abs(value - expected)).toBeLessThanOrEqual(
                getBucketTolerance(expected, histogram['limits'])
            );
        };

        approximate(snapshot.p50, 323); // Tolerance around 10ms
        approximate(snapshot.p95, 562.2); // Tolerance around 50ms
        approximate(snapshot.p99, 567); // Tolerance around 50ms
    });
});
