"use client";
import Grid, { type Padding, DEFAULT_PADDING } from "./utility/grid";
import { useSize } from "./utility/useSize";

type Props = {
    /** Raw array of numeric values to be binned */
    data: number[];
    /** Number of bins (columns) to group data into. Default: 10 */
    binCount?: number;
    padding?: Padding;
    barColor?: string;
    label?: string; // Optional label for the histogram (used in legend)
};

type Bin = {
    x0: number; // Bin start value
    x1: number; // Bin end value
    count: number; // Number of items in bin
};

export default function Histogram({
    data,
    binCount = 10,
    padding = DEFAULT_PADDING,
    barColor = "#3b82f6",
    label = "Histogram"
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated } = useSize();

    if (!data || data.length === 0) {
        return null;
    }

    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;

    // --- 1. CALCULATE X-RANGE (DATA MIN/MAX) ---
    const minX = Math.min(...data);
    const maxX = Math.max(...data);
    // Prevent division by zero if all numbers are identical
    const xRange = maxX === minX ? 1 : maxX - minX;
    const binWidthValue = xRange / binCount;

    // --- 2. AGGREGATE DATA INTO BINS ---
    const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
        x0: minX + i * binWidthValue,
        x1: minX + (i + 1) * binWidthValue,
        count: 0,
    }));

    // Distribute data points into corresponding bins
    data.forEach((val) => {
        // Handle edge case where val === maxX (assign to last bin)
        const rawIndex = Math.floor((val - minX) / binWidthValue);
        const binIndex = Math.min(rawIndex, binCount - 1);
        if (bins[binIndex]) {
            bins[binIndex].count += 1;
        }
    });

    // --- 3. Y-RANGE (MAX FREQUENCY) ---
    const maxCount = Math.max(...bins.map((b) => b.count));
    const maxY = maxCount === 0 ? 1 : maxCount;

    // --- 4. GRID LABELS ---
    const rowCount = 5;
    const yAxisLabels = Array.from({ length: rowCount + 1 }, (_, i) => {
        const val = Math.round((i / rowCount) * maxY);
        return val.toString();
    });

    // X-axis labels mark the boundary values of the bins
    const xAxisLabels = Array.from({ length: binCount + 1 }, (_, i) => {
        const val = minX + i * binWidthValue;
        return Number.isInteger(val) ? val.toString() : val.toFixed(1);
    });

    // --- 5. RENDER BARS ---
    const pxBinWidth = usableWidth / binCount;
    const barGap = 2; // Pixel gap between adjacent bars

    return (
        <Grid
            isHydrated={isHydrated}
            chartWidth={chartWidth}
            chartHeight={chartHeight}
            xAxisLabels={xAxisLabels}
            yAxisLabels={yAxisLabels}
            rows={rowCount}
            cols={binCount}
            padding={padding}
            renderLegend={() => (
                <>
                    <div
                        className="flex items-center gap-1"
                    >
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{
                                backgroundColor: barColor,
                            }}
                        ></div>
                        <span>{label}</span>
                    </div>
                </>
            )}
        >
            {bins.map((bin, index) => {
                const x = padding.left + index * pxBinWidth + barGap / 2;
                const barWidth = Math.max(0, pxBinWidth - barGap);

                const normalizedHeight = bin.count / maxY;
                const barHeight = normalizedHeight * usableHeight;
                const y = chartHeight - padding.bottom - barHeight;

                return (
                    <g key={`bin-${index}`} className="group">
                        <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill={barColor}
                            fillOpacity="0.85"
                            rx="2"
                            className="pointer-events-auto cursor-pointer transition-all duration-150 group-hover:fill-opacity-100"
                        />
                        <title>
                            {`Range: ${bin.x0.toFixed(1)} - ${bin.x1.toFixed(1)}\nCount: ${bin.count}`}
                        </title>
                    </g>
                );
            })}

        </Grid>
    );
}
