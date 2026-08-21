import React, { PropsWithChildren } from "react";

type Props = {
    id?: string;
    w?: string;
    h?: string;
} & PropsWithChildren;

export default function Chart({ children, id = "chart-root", w = "w-full", h = "h-80" }: Props) {
    return (
        <div className={`${w} ${h} rounded-md`} id={id}>
            {children}
        </div>
    );
}

export function useChartDimensions(id: string = "chart-root", w: number = 0, h: number = 320) {
    const [dimensions, setDimensions] = React.useState({ width: w, height: h });
    const [isHydrated, setIsHydrated] = React.useState(false);

    React.useEffect(() => {
        setIsHydrated(true);

        const handleResize = () => {
            const chartContainer = document.getElementById(id);
            if (chartContainer) {
                setDimensions({
                    width: chartContainer.offsetWidth,
                    height: chartContainer.offsetHeight,
                });
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initial call to set the dimensions

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return { ...dimensions, isHydrated };
}

export function renderGridLinesWithLabels(chartWidth: number, usableWidth: number, chartHeight: number, usableHeight: number, paddingLeft: number, paddingBottom: number, paddingTop: number, paddingRight: number, maxValue: number, maxPoints: number, xAxisLabels?: string[]) {
    const horizontalLinesCount = 4;
    const elements: React.JSX.Element[] = [];

    // Y-Axis Labels & Horizontal Grid Lines
    for (let i = 0; i <= horizontalLinesCount; i++) {
        const ratio = i / horizontalLinesCount;
        const y = chartHeight - paddingBottom - (ratio * usableHeight);
        const labelValue = Math.round(ratio * maxValue);

        elements.push(
            <g key={`y-axis-${i}`}>
                <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="var(--variant-4)" // Inline fallback hex equivalent to Tailwind's gray-400
                    fontSize="10px"
                    fontWeight="500"
                    style={{ userSelect: 'none' }}
                >
                    {labelValue}
                </text>
                <line
                    x1={paddingLeft}
                    y1={y}
                    x2={chartWidth - paddingRight}
                    y2={y}
                    stroke="var(--variant-3)"
                    opacity="0.2"
                    strokeWidth="1"
                />
            </g>
        );
    }

    // X-Axis Labels & Vertical Grid Lines
    for (let i = 0; i < maxPoints; i++) {
        const x = paddingLeft + (maxPoints > 1 ? i * (usableWidth / (maxPoints - 1)) : 0);

        elements.push(
            <g key={`x-axis-${i}`}>
                {xAxisLabels && xAxisLabels[i] && (
                    <text
                        x={x}
                        y={chartHeight - 6}
                        textAnchor="middle"
                        fill="var(--variant-4)" // Inline fallback hex equivalent to Tailwind's gray-400
                        fontSize="10px"
                        fontWeight="500"
                        style={{ userSelect: 'none' }}
                    >
                        {xAxisLabels[i]}
                    </text>
                )}
                <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={chartHeight - paddingBottom}
                    stroke="var(--variant-3)"
                    strokeWidth="1"
                    opacity="0.2"
                />
            </g>
        );
    }

    return elements;
}