import type { PropsWithChildren } from "react";

export type Padding = {
    top: number;
    right: number;
    bottom: number;
    left: number;
};

type Props = {
    isHydrated: boolean;
    chartWidth: number;
    chartHeight: number;
    minY?: number;
    maxY?: number;
    rows?: number;
    cols?: number;
    xAxisLabels?: string[];
    yAxisLabels?: string[];
    padding?: Partial<Padding>;
    renderLegend?: () => React.ReactNode;
} & PropsWithChildren;

export const DEFAULT_PADDING: Padding = {
    top: 5,
    right: 5,
    bottom: 5,
    left: 25,
};

export default function Grid({
    isHydrated,
    chartWidth,
    chartHeight,
    minY = 0,
    maxY = 1,
    rows = 5,
    cols = 16,
    xAxisLabels,
    yAxisLabels,
    padding: userPadding,
    renderLegend,
    children,
}: Props) {
    const padding: Padding = { ...DEFAULT_PADDING, ...userPadding };

    const usableWidth = chartWidth - padding.left - padding.right;
    const usableHeight = chartHeight - padding.top - padding.bottom;

    function renderGrid() {
        const elements: React.JSX.Element[] = [];

        // --- Y-AXIS & HORIZONTAL GRIDLINES ---
        for (let i = 0; i <= rows; i++) {
            const ratio = i / rows;
            // Draw from bottom to top
            const y = chartHeight - padding.bottom - ratio * usableHeight;

            // Compute label value dynamically (or use custom yAxisLabels if provided)
            let displayLabel: string;
            if (yAxisLabels && yAxisLabels[i] !== undefined) {
                displayLabel = yAxisLabels[i];
            } else {
                const calculatedValue = minY + ratio * (maxY - minY);
                // Format decimals nicely if step values aren't whole numbers
                displayLabel = Number.isInteger(calculatedValue)
                    ? calculatedValue.toString()
                    : calculatedValue.toFixed(2);
            }

            elements.push(
                <g key={`y-grid-${i}`}>
                    <text
                        x={padding.left - 8}
                        y={y + 3}
                        textAnchor="end"
                        fill="var(--color-accent-soft)"
                        fontSize="10px"
                        fontWeight="500"
                        className="select-none pointer-events-none"
                    >
                        {displayLabel}
                    </text>
                    <line
                        x1={padding.left}
                        y1={y}
                        x2={chartWidth - padding.right}
                        y2={y}
                        stroke="var(--variant-5)"
                        strokeOpacity="0.15"
                        strokeWidth="1"
                    />
                </g>
            );
        }

        // --- X-AXIS & VERTICAL GRIDLINES ---
        for (let i = 0; i < cols; i++) {
            const ratio = cols > 1 ? i / (cols - 1) : 0;
            const x = padding.left + ratio * usableWidth;

            elements.push(
                <g key={`x-grid-${i}`}>
                    {xAxisLabels?.[i] && (
                        <text
                            x={x}
                            y={chartHeight - padding.bottom + 16}
                            textAnchor="middle"
                            fill="var(--color-accent-soft)"
                            fontSize="10px"
                            fontWeight="500"
                            className="select-none pointer-events-none"
                        >
                            {xAxisLabels[i]}
                        </text>
                    )}
                    <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={chartHeight - padding.bottom}
                        stroke="var(--variant-5)"
                        strokeOpacity="0.15"
                        strokeWidth="1"
                    />
                </g>
            );
        }

        return elements;
    }

    return (
        <div
            id="graph-wrapper"
            className="relative w-full h-full p-4 pb-8"
        >
            {renderLegend && (
                <div className="flex flex-wrap justify-end gap-2 text-xs text-brand-50">
                    {renderLegend()}
                </div>
            )}
            <div
                id="graph-root"
                className="relative w-full h-full max-h-[300px]"
            >
                {isHydrated && (
                    <svg
                        className="w-full h-full overflow-visible"
                        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                        preserveAspectRatio="none"
                    >
                        {renderGrid()}
                        {children}
                    </svg>
                )}
            </div>
        </div>
    );
}