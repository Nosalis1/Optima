
/**
 * Generates a hash code for a given value. This function converts the value to a JSON string and computes a hash code based on its characters.
 * @param value The value to be hashed. It can be of any type that can be serialized to JSON.
 * @returns The hash code for the given value.
 */
export function hash(
    value: NonNullable<unknown>
): number {
    const str = JSON.stringify(value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

/**
 * Calculates the rate as a percentage of accounted over total.
 * @param accounted The number of items accounted for.
 * @param total The total number of items.
 * @returns The rate as a percentage.
 */
export function rate(
    accounted: number,
    total: number
): number {
    if (total === 0) return 0;
    return (accounted / total) * 100;
}

/**
 * Calculates the mean (average) of a dataset.
 * @param data - An array of numbers representing the dataset.
 * @returns The mean of the dataset.
 */
export function mean(
    data: number[]
): number {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
}

/**
 * Calculates the specified percentile of a dataset. (e.g., p95, p99)
 * @param data - An array of numbers representing the dataset.
 * @param percentile - The desired percentile (between 0 and 1, e.g., 0.95 for p95).
 * @returns The value at the specified percentile of the dataset.
 */
export function percentile(
    data: number[],
    percentile: number
): number {
    if (data.length === 0) return 0;
    if (percentile >= 1) return Math.max(...data);
    else if (percentile <= 0) return Math.min(...data);

    const sorted = [...data].sort((a, b) => a - b);
    const index = percentile * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
        return sorted[lower];
    }
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calculates the specified percentile of a histogram represented by counters and limits.
 * This function is useful for determining latency percentiles from histogram data.
 * @param counters An array of counts representing the number of occurrences in each histogram bucket.
 * @param totalCount The total number of occurrences across all histogram buckets.
 * @param percentile The desired percentile (between 0 and 1, e.g., 0.95 for p95).
 * @param limits An array of upper limits for each histogram bucket, corresponding to the counters.
 * @returns The value at the specified percentile of the histogram.
 */
export function percentileHistogram(
    counters: Uint32Array,
    totalCount: number,
    percentile: number,
    limits: number[]
): number {
    if (totalCount === 0) return 0;
    if (percentile >= 1) {
        const last = limits[limits.length - 1];
        return Number.isFinite(last) ? last : 0;
    } else if (percentile <= 0) {
        const first = limits[0];
        return Number.isFinite(first) ? first : 0;
    }

    const target = totalCount * percentile;
    let cumulative = 0;

    for (let i = 0; i < counters.length; i++) {
        const previous = cumulative;
        cumulative += counters[i];

        if (cumulative >= target) {
            const lower = i === 0 ? 0 : limits[i - 1];
            const upper = Number.isFinite(limits[i]) ? limits[i] : lower;

            if (upper === lower) return upper;

            const bucketCount = cumulative - previous;
            const bucketPosition = bucketCount === 0
                ? 0
                : (target - previous) / bucketCount;

            return lower + (upper - lower) * bucketPosition;
        }
    }

    return limits[limits.length - 1];
}

/**
 * Calculates the median (p50) of a dataset.
 * @param data - An array of numbers representing the dataset.
 * @returns The median of the dataset.
 */
export function median(
    data: number[]
): number {
    if (data.length === 0) return 0;
    const sorted = [...data].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
        return sorted[mid];
    }
}

/**
 * Calculates the inverse of the standard normal cumulative distribution function (CDF).
 * @param p The probability value (between 0 and 1) for which to calculate the inverse CDF.
 * @returns The z-score corresponding to the given probability value.
 */
function normsinv(p: number): number {
    if (p <= 0 || p >= 1) return 0;

    const t = Math.sqrt(-2.0 * Math.log(p < 0.5 ? p : 1.0 - p));
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;

    const index = t - ((c2 * t + c1) * t + c0) / (((d3 * t + d2) * t + d1) * t + 1.0);
    return p < 0.5 ? -index : index;
}

/**
 * Calculates the required sample size for estimating a population proportion with a specified margin of error and confidence level.
 * The formula used is based on the normal approximation to the binomial distribution.
 * @param marginOfError The desired margin of error (e.g., 0.05 for ±5%).
 * @param confidenceLevel The desired confidence level (default is 0.95 for 95% confidence).
 * @returns The required sample size to achieve the specified margin of error and confidence level.
 */
export function calculateSampleSizeProportion(
    marginOfError: number,
    confidenceLevel: number = 0.95,
): number {
    const alpha = 1 - confidenceLevel;
    const z = normsinv(1 - (alpha / 2));
    const p = 0.5;
    const n = (Math.pow(z, 2) * p * (1 - p)) / Math.pow(marginOfError, 2);
    return Math.ceil(n);
}

/**
 * Calculates the Pearson correlation coefficient (r) between two datasets. 
 * The correlation coefficient measures the strength and direction of the linear relationship between two variables.
 * The value of r ranges from -1 to 1, where:
 * - r = 1 indicates a perfect positive correlation,
 * - r = -1 indicates a perfect negative correlation,
 * - r = 0 indicates no correlation.
 * 
 * The function also provides an interpretation of the correlation strength and assigns a color class for visualization purposes.
 * @param x The first dataset (X values) as an array of numbers.
 * @param y The second dataset (Y values) as an array of numbers.
 * @returns The Pearson correlation coefficient (r).
 */
export function pearsonCorrelation(
    x: number[],
    y: number[]
): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominatorX = 0;
    let denominatorY = 0;

    for (let i = 0; i < n; i++) {
        const diffX = x[i] - meanX;
        const diffY = y[i] - meanY;

        numerator += diffX * diffY;
        denominatorX += diffX * diffX;
        denominatorY += diffY * diffY;
    }

    const denominator = Math.sqrt(denominatorX * denominatorY);
    return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Calculates the ranks of the elements in an array. The rank of an element is its position in the sorted order of the array, with ties receiving the average rank.
 * For example, in the array [3, 1, 2], the ranks would be [3, 1, 2] because 1 is the smallest (rank 1), 2 is the second smallest (rank 2), and 3 is the largest (rank 3).
 * In the case of ties, such as in the array [3, 1, 2, 2], the ranks would be [4, 1, 2.5, 2.5] because both occurrences of 2 share the average rank of (2 + 3) / 2 = 2.5.
 * @param arr An array of numbers for which to calculate the ranks.
 * @returns An array of ranks corresponding to the input array, where each rank indicates the position of the element in the sorted order.
 */
function getRanks(arr: number[]): number[] {
    const sorted = [...arr].map((val, ind) => ({ val, ind })).sort((a, b) => a.val - b.val);
    const ranks = new Array(arr.length);

    let i = 0;
    while (i < sorted.length) {
        let j = i;
        while (j < sorted.length && sorted[j].val === sorted[i].val) {
            j++;
        }
        const rank = (i + 1 + j) / 2;
        for (let k = i; k < j; k++) {
            ranks[sorted[k].ind] = rank;
        }
        i = j;
    }
    return ranks;
}

/**
 * Calculates the Spearman rank correlation coefficient (ρ) between two datasets.
 * @param x An array of numbers representing the first dataset.
 * @param y An array of numbers representing the second dataset.
 * @returns The Spearman rank correlation coefficient (ρ).
 */
export function spearmanCorrelation(
    x: number[],
    y: number[]
): number {
    if (x.length !== y.length || x.length === 0) return 0;

    const n = x.length;

    const ranksX = getRanks(x);
    const ranksY = getRanks(y);

    const meanRX = ranksX.reduce((a, b) => a + b, 0) / n;
    const meanRY = ranksY.reduce((a, b) => a + b, 0) / n;

    let numeratorS = 0;
    let denomSX = 0;
    let denomSY = 0;

    for (let i = 0; i < n; i++) {
        const diffRX = ranksX[i] - meanRX;
        const diffRY = ranksY[i] - meanRY;

        numeratorS += diffRX * diffRY;
        denomSX += diffRX * diffRX;
        denomSY += diffRY * diffRY;
    }

    const denomS = Math.sqrt(denomSX * denomSY);
    const spearmanR = denomS === 0 ? 0 : numeratorS / denomS;
    return spearmanR;
}

/**
 * Calculates the coefficient of determination (R²) and the coefficient of alienation (1 - R²) based on the Pearson correlation coefficient (r).
 * The coefficient of determination (R²) indicates the proportion of the variance in the dependent variable that is predictable from the independent variable.
 * The coefficient of alienation (1 - R²) indicates the proportion of the variance that is not explained by the model.
 * 
 * @param pearsonR The Pearson correlation coefficient (r) between two datasets.
 * @returns An object containing the coefficient of determination (R²) and the coefficient of alienation (1 - R²).
 */
export function determinationAndAlienation(
    pearsonR: number
): { determination: number, alienation: number } {
    const determination = pearsonR * pearsonR;
    const alienation = 1 - determination;
    return { determination, alienation };
}

/**
 * Calculates the standard deviation of a dataset. 
 * The standard deviation is a measure of the amount of variation or dispersion in a set of values.
 * @param data An array of numbers representing the dataset.
 * @returns The standard deviation of the dataset.
 */
export function standardDeviation(
    data: number[]
): number {
    if (data.length === 0) return 0;

    const mu = mean(data);
    const variance = data.reduce((acc, val) => acc + (val - mu) ** 2, 0) / data.length;

    return Math.sqrt(variance);
}

/**
 * Calculates the standard deviation from histogram data.
 * The standard deviation is a measure of the amount of variation or dispersion in a set of values.
 * This function uses the total count, total sum, and total sum of squares to compute the standard deviation.
 * @param totalCount The total number of occurrences across all histogram buckets.
 * @param totalSum The total sum of all values across the histogram buckets.
 * @param totalSumOfSquares The total sum of squares of all values across the histogram buckets.
 * @returns The standard deviation of the histogram data.
 */
export function standardDeviationHistogram(
    totalCount: number,
    totalSum: number,
    totalSumOfSquares: number
): number {
    if (totalCount === 0) return 0;

    const mean = totalSum / totalCount;
    const variance = (totalSumOfSquares / totalCount) - (mean ** 2);

    return Math.sqrt(Math.max(0, variance));
}

/**
 * Calculates the z-score for a given value based on the mean and standard deviation of a dataset.
 * The z-score indicates how many standard deviations a value is from the mean.
 * A positive z-score indicates the value is above the mean, while a negative z-score indicates it is below the mean.
 * @param value The value for which the z-score is to be calculated.
 * @param data An array of numbers representing the dataset.
 * @returns The z-score of the value. If the dataset is empty or has zero standard deviation, the function returns 0.
 */
export function zScore(
    value: number,
    data: number[]
): number {
    if (data.length === 0) return 0;

    const mu = mean(data);
    const sigma = standardDeviation(data);

    if (sigma === 0) return 0;

    return (value - mu) / sigma;
}

/**
 * Calculates the z-score for a given value based on histogram data.
 * The z-score indicates how many standard deviations a value is from the mean.
 * A positive z-score indicates the value is above the mean, while a negative z-score indicates it is below the mean.
 * @param value The value for which the z-score is to be calculated.
 * @param totalCount The total number of occurrences across all histogram buckets.
 * @param totalSum The total sum of all values across the histogram buckets.
 * @param totalSumOfSquares The total sum of squares of all values across the histogram buckets.
 * @returns The z-score of the value. If the histogram is empty or has zero standard deviation, the function returns 0.
 */
export function zScoreHistogram(
    value: number,
    totalCount: number,
    totalSum: number,
    totalSumOfSquares: number
): number {
    if (totalCount === 0) return 0;

    const mu = totalSum / totalCount;
    const sigma = standardDeviationHistogram(totalCount, totalSum, totalSumOfSquares);

    if (sigma === 0) return 0;

    return (value - mu) / sigma;
}

/**
 * Determines if a given value is an anomaly based on its z-score relative to a dataset.
 * A value is considered an anomaly if its z-score exceeds the specified threshold.
 * @param value The value to be evaluated for anomaly detection.
 * @param data An array of numbers representing the dataset against which the value is compared.
 * @param threshold The z-score threshold beyond which a value is considered an anomaly. Default is 3.
 * @returns A boolean indicating whether the value is an anomaly (true) or not (false).
 */
export function isDataAnomaly(
    value: number,
    data: number[],
    threshold: number = 3
): boolean {
    const z = zScore(value, data);
    return Math.abs(z) > threshold;
}

/**
 * Determines if a given value is an anomaly based on its z-score relative to histogram data.
 * A value is considered an anomaly if its z-score exceeds the specified threshold.
 * @param value The value to be evaluated for anomaly detection.
 * @param totalCount The total number of occurrences across all histogram buckets.
 * @param totalSum The total sum of all values across the histogram buckets.
 * @param totalSumOfSquares The total sum of squares of all values across the histogram buckets.
 * @param threshold The z-score threshold beyond which a value is considered an anomaly. Default is 3.
 * @returns A boolean indicating whether the value is an anomaly (true) or not (false).
 */
export function isDataAnomalyHistogram(
    value: number,
    totalCount: number,
    totalSum: number,
    totalSumOfSquares: number,
    threshold: number = 3
): boolean {
    const z = zScoreHistogram(value, totalCount, totalSum, totalSumOfSquares);
    return Math.abs(z) > threshold;
}