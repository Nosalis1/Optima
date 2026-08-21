
type SizeUnit = 'MB' | 'KB' | 'GB';
type TimeUnit = 'ms' | 's';

/**
 * Converts bytes to the specified size unit (MB, KB, GB).
 * @param bytes The number of bytes to convert.
 * @param unit The unit to convert to.
 * @returns The equivalent number in the specified unit.
 */
export function convertBytes(
    bytes: number,
    unit: SizeUnit
): number {
    switch (unit) {
        case 'MB':
            return Math.round(bytes / 1024 / 1024);
        case 'KB':
            return Math.round(bytes / 1024);
        case 'GB':
            return Math.round(bytes / 1024 / 1024 / 1024);
        default:
            throw new Error(`Unsupported unit: ${unit}`);
    }
}

/**
 * Converts a value in the specified size unit (MB, KB, GB) to bytes.
 * @param value The value to convert.
 * @param unit The unit of the value (MB, KB, GB).
 * @returns The equivalent number of bytes.
 */
export function convertToBytes(
    value: number,
    unit: SizeUnit
): number {
    switch (unit) {
        case 'MB':
            return value * 1024 * 1024;
        case 'KB':
            return value * 1024;
        case 'GB':
            return value * 1024 * 1024 * 1024;
        default:
            throw new Error(`Unsupported unit: ${unit}`);
    }
}

/**
 * Converts a value in nanoseconds to the specified time unit (milliseconds or seconds).
 * @param value The value in nanoseconds to convert.
 * @param unit The unit to convert to ('ms' for milliseconds, 's' for seconds).
 * @returns The equivalent number in the specified unit.
 */
export function convertNanoseconds(
    value: number,
    unit: TimeUnit
): number {
    switch (unit) {
        case 'ms':
            return value / 1e6; // Convert nanoseconds to milliseconds
        case 's':
            return value / 1e9; // Convert nanoseconds to seconds
        default:
            throw new Error(`Unsupported unit: ${unit}`);
    }
}

/**
 * Converts a value in the specified time unit (milliseconds or seconds) to nanoseconds.
 * @param value The value to convert.
 * @param unit The unit of the value ('ms' for milliseconds, 's' for seconds).
 * @returns The equivalent number of nanoseconds.
 */
export function convertToNanoseconds(
    value: number,
    unit: TimeUnit
): number {
    switch (unit) {
        case 'ms':
            return value * 1e6; // Convert milliseconds to nanoseconds
        case 's':
            return value * 1e9; // Convert seconds to nanoseconds
        default:
            throw new Error(`Unsupported unit: ${unit}`);
    }
}