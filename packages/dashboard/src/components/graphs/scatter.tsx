"use client";
import Grid, { type Padding, DEFAULT_PADDING } from "./utility/grid";
import { useSize } from "./utility/useSize";

type Point = {
    x: number;
    y: number;
}

type Entry = {
    points: Point[];
    color?: string;
    radius?: number;
    label?: string; // Optional label for the series (used in legend)
}

type Props = {
    data: Entry[];
    padding?: Padding;
    defaultColor?: string;
    defaultRadius?: number;
}

export default function ScatterGraph({
    data,
    padding = DEFAULT_PADDING,
    defaultColor = "#3b82f6",
    defaultRadius = 4
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated, ref } = useSize();

    if (!data || data.length === 0 || data.every((series) => series.points.length === 0)) {
        return null;
    }
    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;

    const allYValues = data.flatMap((series) => series.points.map((p) => p.y));
    const rawMinY = Math.min(...allYValues);
    const rawMaxY = Math.max(...allYValues);

    const minY = rawMinY === rawMaxY ? rawMinY - 1 : rawMinY;
    const maxY = rawMinY === rawMaxY ? rawMaxY + 1 : rawMaxY;
    const yRange = maxY - minY;

    const allXValues = data.flatMap((series) => series.points.map((p) => p.x));
    const rawMinX = Math.min(...allXValues);
    const rawMaxX = Math.max(...allXValues);

    const minX = rawMinX === rawMaxX ? rawMinX - 1 : rawMinX;
    const maxX = rawMinX === rawMaxX ? rawMaxX + 1 : rawMaxX;
    const xRange = maxX - minX;

    const rowCount = 5;
    const colCount = 5;

    const yAxisLabels = Array.from({ length: rowCount + 1 }, (_, i) => {
        const value = minY + (i / rowCount) * yRange;
        return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    });

    const xAxisLabels = Array.from({ length: colCount + 1 }, (_, i) => {
        const value = minX + (i / colCount) * xRange;
        return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    });

    function getScaledPoints(points: Point[]) {
        return points.map((point) => {
            const normalizedX = (point.x - minX) / xRange;
            const x = padding.left + normalizedX * usableWidth;

            const normalizedY = (point.y - minY) / yRange;
            const y = chartHeight - padding.bottom - normalizedY * usableHeight;

            return { x, y, raw: point };
        });
    }

    return (
        <Grid
            ref={ref}
            isHydrated={isHydrated}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            xAxisLabels={xAxisLabels}
            yAxisLabels={yAxisLabels}
            rows={rowCount}
            cols={colCount}
            padding={padding}
            renderLegend={() => (
                <>
                    {data.map((series, idx) => (
                        <div key={`legend-${idx}`} className="flex items-center space-x-2">
                            <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: series.color || defaultColor }}
                            ></div>
                            <span>{series.label || `Series ${idx + 1}`}</span>
                        </div>
                    ))}
                </>
            )}
        >
            {data.map((series, seriesIdx) => {
                const scaledPoints = getScaledPoints(series.points);
                const fillColor = series.color || defaultColor;
                const radius = series.radius || defaultRadius;

                return (
                    <g key={`scatter-series-${seriesIdx}`}>
                        {scaledPoints.map((p, pointIdx) => (
                            <circle
                                key={`point-${seriesIdx}-${pointIdx}`}
                                cx={p.x}
                                cy={p.y}
                                r={radius}
                                fill={fillColor}
                                fillOpacity="0.75"
                                stroke={fillColor}
                                strokeWidth="1.5"
                                className="pointer-events-auto cursor-pointer transition-all duration-150 hover:r-6 hover:fill-opacity-100"
                            >
                                <title>{`X: ${p.raw.x}, Y: ${p.raw.y}`}</title>
                            </circle>
                        ))}
                    </g>
                );
            })}
        </Grid>
    );
}