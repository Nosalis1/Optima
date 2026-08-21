"use client";

import { useSize } from "./utility/useSize";

type LimitZone = {
    from: number;
    to: number;
    color: string;
    label?: string;
};

type Props = {
    current: number;
    from: number;
    to: number;
    variant?: "half" | "full";
    safeAreas?: LimitZone[];
    title?: string;
    unit?: string;
    progressColor?: string;
};

function polarToCartesian(
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
) {
    // Offset by -90° (for full circle starting at top) or -180° (for half circle starting at left)
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians),
    };
}

function describeArc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number
) {
    // Avoid exact 360deg overlap bug in SVG arc rendering
    const actualEndAngle = endAngle - startAngle === 360 ? endAngle - 0.001 : endAngle;

    const start = polarToCartesian(x, y, radius, actualEndAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = actualEndAngle - startAngle <= 180 ? "0" : "1";

    return [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(" ");
}

export default function GaugeGraph({
    current,
    from,
    to,
    variant = "half",
    safeAreas = [],
    title,
    unit = "",
    progressColor = "#3b82f6",
}: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated } = useSize();

    if (to <= from) return null;

    const isFull = variant === "full";

    const startAngle = isFull ? -90 : 180;
    const totalSpan = isFull ? 360 : 180;
    const endAngle = startAngle + totalSpan;

    const cx = (chartWidth || 200) / 2;
    const cy = isFull ? (chartHeight || 200) / 2 : (chartHeight || 200) * 0.65;

    const outerRadius = Math.min(cx, cy) - 24;
    const innerRadius = outerRadius - 16; // 16px offset gap between rings

    const outerStrokeWidth = 12; // Thick outer limits track
    const innerStrokeWidth = 10; // Progress bar track

    const clampedVal = Math.min(Math.max(current, from), to);
    const valueRatio = (clampedVal - from) / (to - from);
    const progressEndAngle = startAngle + valueRatio * totalSpan;

    return (
        <div className="relative w-full h-full p-4 flex flex-col items-center justify-center">
            {isHydrated && (
                <svg
                    className="w-full h-full overflow-visible"
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                >
                    <path
                        d={describeArc(cx, cy, outerRadius, startAngle, endAngle)}
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth={outerStrokeWidth}
                        strokeLinecap={"round"}
                    />

                    {safeAreas.map((area, idx) => {
                        const zoneStart = Math.min(Math.max(area.from, from), to);
                        const zoneTo = Math.min(Math.max(area.to, from), to);

                        const startRatio = (zoneStart - from) / (to - from);
                        const endRatio = (zoneTo - from) / (to - from);

                        const aStartAngle = startAngle + startRatio * totalSpan;
                        const aEndAngle = startAngle + endRatio * totalSpan;

                        if (aStartAngle >= aEndAngle) return null;

                        return (
                            <path
                                key={`threshold-${idx}`}
                                d={describeArc(cx, cy, outerRadius, aStartAngle, aEndAngle)}
                                fill="none"
                                stroke={area.color}
                                strokeWidth={outerStrokeWidth}
                                opacity="0.85"
                                strokeLinecap={'round'}
                            >
                                <title>{`${area.label || "Limit Zone"}: ${area.from} - ${area.to}`}</title>
                            </path>
                        );
                    })}

                    <path
                        d={describeArc(cx, cy, innerRadius, startAngle, endAngle)}
                        fill="none"
                        stroke="#0f172a"
                        strokeWidth={innerStrokeWidth}
                        strokeLinecap={isFull ? "butt" : "round"}
                    />

                    {valueRatio > 0 && (
                        <path
                            d={describeArc(cx, cy, innerRadius, startAngle, progressEndAngle)}
                            fill="none"
                            stroke={progressColor}
                            strokeWidth={innerStrokeWidth}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                        />
                    )}

                    <g transform={`translate(${cx}, ${isFull ? cy : cy - 10})`}>
                        {/* Current Value */}
                        <text
                            x="0"
                            y="0"
                            textAnchor="middle"
                            fill="#ffffff"
                            fontSize="24px"
                            fontWeight="700"
                            dominantBaseline="central"
                        >
                            {current}
                            <tspan fontSize="13px" fill="#9ca3af" dx="2">
                                {unit}
                            </tspan>
                        </text>

                        {/* Title or Subtext */}
                        {title && (
                            <text
                                x="0"
                                y="26"
                                textAnchor="middle"
                                fill="#9ca3af"
                                fontSize="11px"
                                fontWeight="500"
                            >
                                {title}
                            </text>
                        )}
                    </g>
                </svg>
            )}
        </div>
    );
}