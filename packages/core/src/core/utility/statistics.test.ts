import { expect, describe, test } from '@jest/globals';
import * as Statistics from './statistics';
import { getBucketTolerance } from "../storage/utility/histogram";

describe('Statistics Utility Functions', () => {
    test('hash generates consistent hash codes for the same value', () => {
        const value = { key: 'value' };
        const hash1 = Statistics.hash(value);
        const hash2 = Statistics.hash(value);
        expect(hash1).toBe(hash2);
    });

    test('rate calculates the correct percentage', () => {
        expect(Statistics.rate(50, 200)).toBe(25);
        expect(Statistics.rate(0, 100)).toBe(0);
        expect(Statistics.rate(100, 0)).toBe(0); // Avoid division by zero
    });

    test('mean calculates the correct average', () => {
        const data = [1, 2, 3, 4, 5];
        expect(Statistics.mean(data)).toBe(3);
        expect(Statistics.mean([])).toBe(0); // Edge case: empty array
    });

    test('percentile calculates the correct percentile', () => {
        const data = [250, 332, 127, 257, 551, 323, 567];

        expect(Statistics.percentile(data, 0.5)).toBe(323); // p50
        expect(Statistics.percentile(data, 0.85)).toBe(552.6); // p85
        expect(Statistics.percentile(data, 0.95)).toBe(562.2); // p95
        expect(Statistics.percentile(data, 0.99)).toBe(566.04); // p99
        expect(Statistics.percentile(data, 1.5)).toBe(567); // Edge case: percentile > 1
        expect(Statistics.percentile(data, 1)).toBe(567); // p100
        expect(Statistics.percentile(data, 0)).toBe(127); // p0
        expect(Statistics.percentile(data, -0.5)).toBe(127); // Edge case: negative percentile
        expect(Statistics.percentile([], 0.5)).toBe(0); // Edge case: empty array
    });

    test('percentileHistogram calculates the correct percentile from histogram data', () => {
        const counters = new Uint32Array([250, 332, 127, 257, 551, 323, 567]);
        const totalCount = counters.reduce((acc, val) => acc + val, 0);
        const limits = [
            1, 2, 5, 10, 20, 50,
            100, 200, 500, 1000,
            2000, 5000, 10000,
            Infinity,
        ];

        const approximate = (value: number, expected: number) => {
            expect(Math.abs(value - expected)).toBeLessThanOrEqual(
                getBucketTolerance(expected, limits)
            );
        };

        approximate(Statistics.percentileHistogram(counters, totalCount, 0.5, limits), 323); // p50
        approximate(Statistics.percentileHistogram(counters, totalCount, 0.95, limits), 562.2); // p95
        approximate(Statistics.percentileHistogram(counters, totalCount, 0.99, limits), 566.04); // p99
        approximate(Statistics.percentileHistogram(counters, totalCount, 1, limits), 567); // p100
        approximate(Statistics.percentileHistogram(counters, totalCount, 0, limits), 127); // p0
        approximate(Statistics.percentileHistogram(counters, totalCount, -0.5, limits), 127); // Edge case: negative percentile
        approximate(Statistics.percentileHistogram(new Uint32Array([]), 0, 0.5, limits), 0); // Edge case: empty histogram
    });

    test('median calculates the correct median', () => {
        const oddData = [3, 1, 2];
        const evenData = [4, 1, 2, 3];
        expect(Statistics.median(oddData)).toBe(2);
        expect(Statistics.median(evenData)).toBe(2.5);
        expect(Statistics.median([])).toBe(0); // Edge case: empty array
    });

    test('calculateSampleSizeProportion calculates the correct size proportions', () => {
        expect(Statistics.calculateSampleSizeProportion(0.05, 0.95)).toBe(385);
        expect(Statistics.calculateSampleSizeProportion(0.05, 0.99)).toBe(664);
        expect(Statistics.calculateSampleSizeProportion(0.05, 0.90)).toBe(271);
        expect(Statistics.calculateSampleSizeProportion(0.1, 0.95)).toBe(97);
    });

    test('pearsonCorrelation calculates the correct correlation coefficient', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [2, 4, 6, 8, 10]; // Perfect positive correlation
        expect(Statistics.pearsonCorrelation(x, y)).toBeCloseTo(1);

        const yNegative = [10, 8, 6, 4, 2]; // Perfect negative correlation
        expect(Statistics.pearsonCorrelation(x, yNegative)).toBeCloseTo(-1);

        const yNoCorrelation = [5, 3, 1, 4, 2]; // No correlation
        expect(Statistics.pearsonCorrelation(x, yNoCorrelation)).toBeCloseTo(-0.5);

        const yConstant = [3, 3, 3, 3, 3]; // Constant values
        expect(Statistics.pearsonCorrelation(x, yConstant)).toBeCloseTo(0); // Edge case: constant values

        const emptyX: number[] = [];
        const emptyY: number[] = [];
        expect(Statistics.pearsonCorrelation(emptyX, emptyY)).toBeCloseTo(0); // Edge case: empty arrays
    });

    test('spearmanCorrelation calculates the correct correlation coefficient', () => {
        const x = [1, 2, 3, 4, 5];
        const y = [2, 4, 6, 8, 10]; // Perfect positive correlation
        expect(Statistics.spearmanCorrelation(x, y)).toBeCloseTo(1);

        const yNegative = [10, 8, 6, 4, 2]; // Perfect negative correlation
        expect(Statistics.spearmanCorrelation(x, yNegative)).toBeCloseTo(-1);

        const yNoCorrelation = [5, 3, 1, 4, 2]; // No correlation
        expect(Statistics.spearmanCorrelation(x, yNoCorrelation)).toBeCloseTo(-0.5);

        const yConstant = [3, 3, 3, 3, 3]; // Constant values
        expect(Statistics.spearmanCorrelation(x, yConstant)).toBeCloseTo(0); // Edge case: constant values

        const emptyX: number[] = [];
        const emptyY: number[] = [];
        expect(Statistics.spearmanCorrelation(emptyX, emptyY)).toBeCloseTo(0); // Edge case: empty arrays
    });

    test('determinationAndAlienation calculates the correct determination and alienation coefficients', () => {
        const pearsonR = 0.8;
        const result = Statistics.determinationAndAlienation(pearsonR);
        expect(result.determination).toBeCloseTo(0.64); // R^2
        expect(result.alienation).toBeCloseTo(0.36); // 1 - R^2

        const negativePearsonR = -0.6;
        const negativeResult = Statistics.determinationAndAlienation(negativePearsonR);
        expect(negativeResult.determination).toBeCloseTo(0.36); // R^2
        expect(negativeResult.alienation).toBeCloseTo(0.64); // 1 - R^2

        const zeroPearsonR = 0;
        const zeroResult = Statistics.determinationAndAlienation(zeroPearsonR);
        expect(zeroResult.determination).toBeCloseTo(0); // R^2
        expect(zeroResult.alienation).toBeCloseTo(1); // 1 - R^2
    });

    test('standardDeviation calculates the correct standard deviation', () => {
        const data = [1, 2, 3, 4, 5];
        const expectedStdDev = Math.sqrt(2); // Standard deviation for this dataset
        expect(Statistics.standardDeviation(data)).toBeCloseTo(expectedStdDev);
        expect(Statistics.standardDeviation([])).toBe(0); // Edge case: empty array
    });

    test('standardDeviationHistogram calculates the correct standard deviation from histogram data', () => {
        const data = [1, 2, 3, 4, 5];
        const totalCount = data.length;
        const totalSum = data.reduce((acc, val) => acc + val, 0);
        const totalSumOfSquares = data.reduce((acc, val) => acc + val * val, 0);
        const expectedStdDev = Math.sqrt(2); // Standard deviation for this dataset
        expect(Statistics.standardDeviationHistogram(totalCount, totalSum, totalSumOfSquares)).toBeCloseTo(expectedStdDev);
        expect(Statistics.standardDeviationHistogram(0, 0, 0)).toBe(0); // Edge case: empty histogram
    });

    test('zScore calculates the correct z-score', () => {
        const historical = [10, 12, 14, 15, 13, 11, 12, 15, 13, 14];
        expect(Statistics.zScore(18, historical)).toBeCloseTo(3.23);
        expect(Statistics.zScore(9, historical)).toBeCloseTo(-2.47);
        expect(Statistics.zScore(12, historical)).toBeCloseTo(-0.57);
        expect(Statistics.zScore(12, [])).toBe(0); // Edge case: empty historical data
        expect(Statistics.zScore(12, [12, 12, 12])).toBe(0); // Edge case: zero standard deviation
    });

    test('zScoreHistogram calculates the correct z-score from histogram data', () => {
        const historical = [10, 12, 14, 15, 13, 11, 12, 15, 13, 14];
        const totalCount = historical.length;
        const totalSum = historical.reduce((acc, val) => acc + val, 0);
        const totalSumOfSquares = historical.reduce((acc, val) => acc + val * val, 0);
        expect(Statistics.zScoreHistogram(18, totalCount, totalSum, totalSumOfSquares)).toBeCloseTo(3.23);
        expect(Statistics.zScoreHistogram(9, totalCount, totalSum, totalSumOfSquares)).toBeCloseTo(-2.47);
        expect(Statistics.zScoreHistogram(12, totalCount, totalSum, totalSumOfSquares)).toBeCloseTo(-0.57);
        expect(Statistics.zScoreHistogram(12, 0, 0, 0)).toBe(0); // Edge case: empty histogram
        expect(Statistics.zScoreHistogram(12, 3, 36, 432)).toBe(0); // Edge case: zero standard deviation
    });

    test('isDataAnomaly correctly identifies anomalies', () => {
        const historical = [10, 12, 14, 15, 13, 11, 12, 15, 13, 14];
        expect(Statistics.isDataAnomaly(18, historical)).toBe(true);
        expect(Statistics.isDataAnomaly(9, historical)).toBe(false);
        expect(Statistics.isDataAnomaly(12, historical)).toBe(false);
        expect(Statistics.isDataAnomaly(8, historical)).toBe(true);
        expect(Statistics.isDataAnomaly(12, [])).toBe(false); // Edge case: empty historical data
        expect(Statistics.isDataAnomaly(12, [12, 12, 12])).toBe(false); // Edge case: zero standard deviation
    });

    test('isDataAnomalyHistogram correctly identifies anomalies from histogram data', () => {
        const historical = [10, 12, 14, 15, 13, 11, 12, 15, 13, 14];
        const totalCount = historical.length;
        const totalSum = historical.reduce((acc, val) => acc + val, 0);
        const totalSumOfSquares = historical.reduce((acc, val) => acc + val * val, 0);
        expect(Statistics.isDataAnomalyHistogram(18, totalCount, totalSum, totalSumOfSquares)).toBe(true);
        expect(Statistics.isDataAnomalyHistogram(9, totalCount, totalSum, totalSumOfSquares)).toBe(false);
        expect(Statistics.isDataAnomalyHistogram(12, totalCount, totalSum, totalSumOfSquares)).toBe(false);
        expect(Statistics.isDataAnomalyHistogram(8, totalCount, totalSum, totalSumOfSquares)).toBe(true);
        expect(Statistics.isDataAnomalyHistogram(12, 0, 0, 0)).toBe(false); // Edge case: empty histogram
        expect(Statistics.isDataAnomalyHistogram(12, 3, 36, 432)).toBe(false); // Edge case: zero standard deviation
    });
});