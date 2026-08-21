export const formatNumber = (num: number) => {
  return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/**
 * Format numbers in a more readable way, e.g. 1,000 -> 1k
 * @param num The number to format
 * @returns The formatted number as a string
 */
export const formatBigNumber = (num?: number): string => {
  if (num === undefined || num === null) {
    return '0';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'm';
  }
  return num.toString();
}