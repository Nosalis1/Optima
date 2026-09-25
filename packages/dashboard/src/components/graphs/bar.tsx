"use client";

import Grid, { type Padding, DEFAULT_PADDING } from "./utility/grid";
import { useSize } from "./utility/useSize";

type Series = {
    label: string; // Legend / Series name
    values: number[]; // Values matching categories index-by-index
    color?: string;
};

type Props = {
    categories: string[];
    data: Series[];
    padding?: Padding;
    defaultColor?: string;
};

export default function BarChart({
    categories,
    data,
    padding = DEFAULT_PADDING,
    defaultColor = "#3b82f6",
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated, ref } = useSize();

    if (!categories || categories.length === 0 || !data || data.length === 0) {
        return null;
    }

    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;

    const allValues = data.flatMap((series) => series.values);
    const rawMaxY = Math.max(...allValues, 0);
    const rawMinY = Math.min(...allValues, 0);

    const maxY = rawMaxY === 0 ? 1 : rawMaxY;
    const minY = rawMinY;
    const yRange = maxY - minY;

    const rowCount = 5;
    const yAxisLabels = Array.from({ length: rowCount + 1 }, (_, i) => {
        const val = minY + (i / rowCount) * yRange;
        return Number.isInteger(val) ? val.toString() : val.toFixed(1);
    });

    const categoryCount = categories.length;
    const groupWidth = usableWidth / categoryCount;
    const groupPaddingRatio = 0.2;
    const availableGroupWidth = groupWidth * (1 - groupPaddingRatio);

    const seriesCount = data.length;
    const barGap = 2;
    const singleBarWidth = Math.max(
        1,
        (availableGroupWidth - barGap * (seriesCount - 1)) / seriesCount
    );

    return (
        <Grid
            ref={ref}
            isHydrated={isHydrated}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            xAxisLabels={categories}
            yAxisLabels={yAxisLabels}
            rows={rowCount}
            cols={categoryCount}
            padding={padding}
            renderLegend={() => (
                <>
                    {data.map((series, idx) => (
                        <div
                            key={`legend-${idx}`}
                            className="flex items-center gap-1"
                        >
                            <div
                                className="w-3 h-3 rounded-sm"
                                style={{
                                    backgroundColor: series.color || defaultColor,
                                }}
                            ></div>
                            <span>{series.label}</span>
                        </div>
                    ))}
                </>
            )}
        >
            {categories.map((category, catIdx) => {
                // Center point of the current category column
                const groupStartX =
                    padding.left +
                    catIdx * groupWidth +
                    (groupWidth - availableGroupWidth) / 2;

                return (
                    <g key={`category-${catIdx}`}>
                        {data.map((series, seriesIdx) => {
                            const value = series.values[catIdx] ?? 0;
                            const fillColor = series.color || defaultColor;

                            // Calculate individual bar X position
                            const x =
                                groupStartX +
                                seriesIdx * (singleBarWidth + barGap);

                            // Calculate height relative to Y-range
                            const normalizedY = (value - minY) / yRange;
                            const barHeight = normalizedY * usableHeight;
                            const y = chartHeight - padding.bottom - barHeight;

                            return (
                                <rect
                                    key={`bar-${catIdx}-${seriesIdx}`}
                                    x={x}
                                    y={y}
                                    width={singleBarWidth}
                                    height={Math.max(0, barHeight)}
                                    fill={fillColor}
                                    fillOpacity="0.85"
                                    rx="3"
                                    className="pointer-events-auto cursor-pointer transition-all duration-150 hover:fill-opacity-100"
                                >
                                    <title>{`${category} (${series.label}): ${value}`}</title>
                                </rect>
                            );
                        })}
                    </g>
                );
            })}
        </Grid>
    );
}