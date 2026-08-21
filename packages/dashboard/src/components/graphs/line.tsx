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
}

export default function LineGraph({
    data,
    padding = DEFAULT_PADDING,
    defaultColor = "#3b82f6",
    defaultType = 'solid',
    withDots = true
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated } = useSize();

    if (!data || data.length === 0
        // || data.every((series) => series.points.length === 0)
    ) {
        return null;
    }

    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;
    const baselineY = chartHeight - padding.bottom;

    const allYValues = data.flatMap((series) => series.points.map((p) => p.y));
    const rawMinY = Math.min(...allYValues);
    const rawMaxY = Math.max(...allYValues);

    const minY = rawMinY === rawMaxY ? rawMinY - 1 : rawMinY;
    const maxY = rawMinY === rawMaxY ? rawMaxY + 1 : rawMaxY;
    const yRange = maxY - minY;

    const longestSeries = data.reduce(
        (max, series) => (series.points.length > max.length ? series.points : max),
        [] as Point[]
    );
    // const xAxisLabels = longestSeries.map((p) => p.x.toString());
    const colCount = data[0].points.length / 5 + 1;
    const xAxisLabels = Array.from({ length: colCount }, (_, idx) => `${idx * 5}`);

    const rowCount = 4;
    const yAxisLabels = Array.from({ length: rowCount + 1 }, (_, i) => {
        const value = minY + (i / rowCount) * yRange;
        return Number.isInteger(value) ? value.toString() : value.toFixed(1);
    });

    const allXValues = data.flatMap((series) => series.points.map((p) => p.x));
    const minX = Math.min(...allXValues);
    const maxX = Math.max(...allXValues);
    const xRange = maxX - minX || 1; // avoid division by zero

    function getScaledPoints(points: Point[]) {
        const totalPoints = points.length;

        const mappedPoints = points.map((point) => {
            // Time-based position (not index-based)
            const normalizedX = (point.x - minX) / xRange;
            const x = padding.left + normalizedX * usableWidth;

            const normalizedY = (point.y - minY) / yRange;
            const y = chartHeight - padding.bottom - normalizedY * usableHeight;

            return { x, y, raw: point };
        });
        // const mappedPoints = points.map((point, index) => {
        //     const ratioX = totalPoints > 1 ? index / (totalPoints - 1) : 0.5;
        //     const x = padding.left + ratioX * usableWidth;

        //     const normalizedY = (point.y - minY) / yRange;
        //     const y = chartHeight - padding.bottom - normalizedY * usableHeight;

        //     return { x, y, raw: point };
        // });

        const segments: Array<{ x: number, y: number, raw: Point }[]> = [];
        let currentSegment: { x: number, y: number, raw: Point }[] = [];

        mappedPoints.forEach((p) => {
            if (p) {
                currentSegment.push(p);
            } else if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        });
        if (currentSegment.length > 0) {
            segments.push(currentSegment);
        }

        return segments;
    }

    return (
        <Grid
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
                const segments = getScaledPoints(series.points);
                const strokeColor = series.color || defaultColor;
                const lineStyle = series.type || defaultType;
                const fillArea = series.fillArea ?? true; // Default to fill area

                return (
                    <g key={`series-${seriesIdx}`}>
                        {segments.map((segment, segIdx) => {
                            if (segment.length === 0) return null;

                            const linePoints = segment.map((p) => `${p.x},${p.y}`).join(" ");

                            // Build closed path for area fill:
                            // Start at baseline below first point -> line to all points -> drop to baseline below last point -> close
                            const firstX = segment[0].x;
                            const lastX = segment[segment.length - 1].x;
                            const areaPathD = [
                                `M ${firstX},${baselineY}`,
                                ...segment.map((p) => `L ${p.x},${p.y}`),
                                `L ${lastX},${baselineY}`,
                                "Z",
                            ].join(" ");

                            return (
                                <g key={`segment-${segIdx}`}>
                                    {/* 1. AREA FILL (GRADIENT) */}
                                    {fillArea && segment.length > 1 && (
                                        <path
                                            d={areaPathD}
                                            fill={`url(#area-gradient-${seriesIdx})`}
                                            stroke="none"
                                        />
                                    )}

                                    {/* 2. LINE PATH */}
                                    {segment.length > 1 ? (
                                        <polyline
                                            fill="none"
                                            stroke={strokeColor}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeDasharray={lineStyle === "dashed" ? "6,6" : undefined}
                                            points={linePoints}
                                        />
                                    ) : null}

                                    {/* 3. DATA POINTS */}
                                    {withDots && segment.map((p, pointIdx) => (
                                        <circle
                                            key={`point-${segIdx}-${pointIdx}`}
                                            cx={p.x}
                                            cy={p.y}
                                            r="4"
                                            className="fill-brand-900 stroke-2 pointer-events-auto cursor-pointer"
                                            stroke={strokeColor}
                                        >
                                            <title>{`X: ${p.raw.x}, Y: ${p.raw.y}`}</title>
                                        </circle>
                                    ))}
                                </g>
                            );
                        })}
                    </g>
                );
            })}
        </Grid>
    );
}
