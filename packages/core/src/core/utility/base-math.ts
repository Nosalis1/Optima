
/**
 * Clamps a value between a minimum and maximum value.
 * @param value - The value to be clamped.
 * @param min - The minimum value to clamp to.
 * @param max - The maximum value to clamp to.
 * @returns The clamped value, guaranteed to be between min and max.
 */
export function clamp(
    value: number,
    min: number,
    max: number
): number {
    return Math.min(max, Math.max(min, value));
}

/**
 * Clamps a given value to ensure it falls within the range of 0 to 100.
 * @param value - The value to be clamped, typically representing a percentage.
 * @param total - The total value used to calculate the percentage.
 * @returns The clamped percentage value, guaranteed to be between 0 and 100.
 */
export function toPercentage(
    value: number,
    total: number
): number {
    if (total === 0) {
        return 0; // Avoid division by zero
    }
    return clamp((value / total) * 100, 0, 100);
}