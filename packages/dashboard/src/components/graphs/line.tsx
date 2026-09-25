"use client";
import Grid, { type Padding, DEFAULT_PADDING } from "./utility/grid";
import { getNiceScale } from "./utility/nice-scale";
import { useSize } from "./utility/useSize";

type Point = { x: number; y: number; }

type Entry = {
    points: Point[];
    color?: string;
    type?: 'solid' | 'dashed';
    fillArea?: boolean;
    label?: string; // Optional label for the series (used in legend)
}

type Props = {
    data: Entry[];
    padding?: Padding;
    defaultColor?: string;
    defaultType?: "solid" | "dashed";
    withDots?: boolean;
    rows?: number; // Optional: number of rows for the grid
    cols?: number; // Optional: number of columns for the grid
    formatXLabel?: (value: number, idx: number) => string;
}

const defaultFormatXLabel = (value: number, idx: number): string => Number.isInteger(value) ? value.toString() : value.toFixed(1);
const indexFormatXLabel = (value: number, idx: number): string => `${idx * 5}`;

export default function LineGraph({
    data,
    padding = DEFAULT_PADDING,
    defaultColor = "#3b82f6",
    defaultType = 'solid',
    withDots = true,
    rows = 6,
    cols = 5,
    formatXLabel = indexFormatXLabel,
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated, ref } = useSize<HTMLDivElement>();

    if (!data || data.length === 0) {
        return <div ref={ref} className="w-full h-full" />;
    }

    const allYValues = data.flatMap((series) => series.points.map((p) => p.y));
    if (allYValues.length === 0) {
        return <div ref={ref} className="w-full h-full" />;
    }

    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const baselineY = chartHeight - padding.bottom;

    const rawMinY = Math.min(...allYValues);
    const rawMaxY = Math.max(...allYValues);

    const rowCount = rows;
    const { min: minY, max: maxY, step: yStep } = getNiceScale(rawMinY, rawMaxY, rowCount);
    const yRange = maxY - minY;

    const longestSeries = data.reduce(
        (max, series) => (series.points.length > max.length ? series.points : max),
        [] as Point[]
    );

    const allXValues = data.flatMap((series) => series.points.map((p) => p.x));
    const minX = Math.min(...allXValues);
    const maxX = Math.max(...allXValues);
    const xRange = maxX - minX || 1; // avoid division by zero

    const colCount = Math.max(1, Math.ceil(longestSeries.length / cols));
    const xAxisLabels = Array.from({ length: colCount + 1 }, (_, idx) => {
        const value = minX + (idx / colCount) * xRange;
        return formatXLabel(value, idx);
    });

    const yAxisLabels = Array.from({ length: rowCount + 1 }, (_, i) => {
        const value = minY + (i / rowCount) * yRange;
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
            <defs>
                {data.map((series, idx) => {
                    const color = series.color || defaultColor;
                    return (
                        <linearGradient
                            key={`fill-grad-${idx}`}
                            id={`area-gradient-${idx}`}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
                            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                        </linearGradient>
                    );
                })}
            </defs>

            {data.map((series, seriesIdx) => {
                if (series.points.length === 0) return null;

                const points = getScaledPoints(series.points);
                const strokeColor = series.color || defaultColor;
                const lineStyle = series.type || defaultType;
                const fillArea = series.fillArea ?? true;

                const linePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

                const firstX = points[0].x;
                const lastX = points[points.length - 1].x;
                const areaPathD = [
                    `M ${firstX},${baselineY}`,
                    ...points.map((p) => `L ${p.x},${p.y}`),
                    `L ${lastX},${baselineY}`,
                    "Z",
                ].join(" ");

                return (
                    <g key={`series-${seriesIdx}`}>
                        {/* Area fill (gradient) */}
                        {
                            fillArea && points.length > 1 && (
                                <path
                                    d={areaPathD}
                                    fill={`url(#area-gradient-${seriesIdx})`}
                                    stroke="none"
                                />
                            )
                        }

                        {/* Line path */}
                        {
                            points.length > 1 ? (
                                <polyline
                                    fill="none"
                                    stroke={strokeColor}
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeDasharray={lineStyle === 'dashed' ? "6,6" : undefined}
                                    points={linePoints}
                                />
                            ) : null
                        }

                        {/* Data points */}
                        {
                            withDots && points.map((p, pointIdx) => (
                                <circle
                                    key={`point-${seriesIdx}-${pointIdx}`}
                                    cx={p.x}
                                    cy={p.y}
                                    r="4"
                                    className="fill-brand-900 stroke-2 pointer-events-auto cursor-pointer"
                                    stroke={strokeColor}
                                >
                                    <title>{`X: ${p.raw.x}, Y: ${p.raw.y}`}</title>
                                </circle>
                            ))
                        }
                    </g>
                );
            })}
        </Grid>
    );
}
