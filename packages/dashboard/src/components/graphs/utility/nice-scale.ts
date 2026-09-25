export interface NiceScale {
    min: number;
    max: number;
    step: number;
}

function getNiceStep(rawRange: number, targetTicks: number): number {
    if (rawRange <= 0) return 1;

    const roughStep = rawRange / Math.max(1, targetTicks);
    const exponent = Math.floor(Math.log10(roughStep));
    const fraction = roughStep / Math.pow(10, exponent);

    let niceFraction: number;
    if (fraction <= 1) niceFraction = 1;
    else if (fraction <= 2) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;

    return niceFraction * Math.pow(10, exponent);
}

export function getNiceScale(rawMin: number, rawMax: number, rows: number): NiceScale {
    if (rows <= 0) {
        throw new Error("Number of rows must be greater than 0");
    }

    if (rawMin === rawMax) {
        const padding = Math.abs(rawMin) || 1;
        rawMin -= padding;
        rawMax += padding;
    }

    const step = getNiceStep(rawMax - rawMin, rows);
    const min = Math.floor(rawMin / step) * step;
    const max = Math.ceil(rawMax / step) * step;

    if (min > rawMin || max < rawMax) {
        throw new Error("Nice scale calculation failed: min or max is out of bounds");
    }

    return { min, max, step };
}

export function formatNiceValue(value: number, step: number): string {
    const decimals = step < 1 ? Math.max(0, -Math.floor(Math.log10(step))) : 0;
    return value.toFixed(decimals);
}