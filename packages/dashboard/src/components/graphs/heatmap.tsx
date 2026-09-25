"use client";

import Grid, { type Padding, DEFAULT_PADDING } from "./utility/grid";
import { useSize } from "./utility/useSize";

type Cell = {
    x: string; // Category matching xAxisLabels
    y: string; // Category matching yAxisLabels
    value: number;
};

type Props = {
    xAxisLabels: string[];
    yAxisLabels: string[];
    data: Cell[];
    padding?: Padding;
    minColor?: string;
    maxColor?: string;
};

function interpolateColor(color1: string, color2: string, ratio: number): string {
    const hex = (c: string) => parseInt(c.replace("#", ""), 16);
    const r1 = (hex(color1) >> 16) & 255;
    const g1 = (hex(color1) >> 8) & 255;
    const b1 = hex(color1) & 255;

    const r2 = (hex(color2) >> 16) & 255;
    const g2 = (hex(color2) >> 8) & 255;
    const b2 = hex(color2) & 255;

    const r = Math.round(r1 + ratio * (r2 - r1));
    const g = Math.round(g1 + ratio * (g2 - g1));
    const b = Math.round(b1 + ratio * (b2 - b1));

    return `rgb(${r}, ${g}, ${b})`;
}

export default function Heatmap({
    xAxisLabels,
    yAxisLabels,
    data,
    padding = DEFAULT_PADDING,
    minColor = "#1e293b",
    maxColor = "#10b981",
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated, ref } = useSize();

    if (!xAxisLabels.length || !yAxisLabels.length || !data.length) {
        return null;
    }

    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;

    // --- 1. VALUE RANGE CALCULATIONS ---
    const values = data.map((d) => d.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    const minVal = rawMin === rawMax ? rawMin - 1 : rawMin;
    const maxVal = rawMin === rawMax ? rawMax + 1 : rawMax;
    const valRange = maxVal - minVal;

    // --- 2. GRID METRICS ---
    const colCount = xAxisLabels.length;
    const rowCount = yAxisLabels.length;

    const cellGap = 2; // Pixel gap between heatmap tiles
    const cellWidth = Math.max(0, usableWidth / colCount - cellGap);
    const cellHeight = Math.max(0, usableHeight / rowCount - cellGap);

    // Fast lookup map for cell values: "xLabel:yLabel" -> value
    const dataMap = new Map<string, number>();
    data.forEach((d) => dataMap.set(`${d.x}:${d.y}`, d.value));

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
            renderLegend={() => {
                return (
                    <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2 text-xs font-medium text-gray-400">
                            <span>{minVal}</span>

                            <div
                                className="w-32 h-3 shadow-inner rounded"
                                style={{
                                    background: `linear-gradient(to right, ${minColor}, ${maxColor})`,
                                }}
                            />

                            <span>{maxVal}</span>
                        </div>
                    </div>
                );
            }}
        >
            {yAxisLabels.map((yLabel, rowIdx) => {
                // Plot top-to-bottom
                const y =
                    padding.top +
                    rowIdx * (usableHeight / rowCount) +
                    cellGap / 2;

                return xAxisLabels.map((xLabel, colIdx) => {
                    const x =
                        padding.left +
                        colIdx * (usableWidth / colCount) +
                        cellGap / 2;

                    const value = dataMap.get(`${xLabel}:${yLabel}`) ?? minVal;
                    const ratio = Math.max(0, Math.min(1, (value - minVal) / valRange));
                    const tileColor = interpolateColor(minColor, maxColor, ratio);

                    return (
                        <g key={`cell-${colIdx}-${rowIdx}`}>
                            <rect
                                x={x}
                                y={y}
                                width={cellWidth}
                                height={cellHeight}
                                fill={tileColor}
                                rx="3"
                                className="pointer-events-auto cursor-pointer transition-all duration-150 hover:stroke-2 hover:stroke-white/50"
                            >
                                <title>{`${xLabel}, ${yLabel}\nValue: ${value}`}</title>
                            </rect>
                        </g>
                    );
                });
            })}
        </Grid>
    );
}