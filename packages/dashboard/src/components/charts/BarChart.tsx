"use client";
import React from "react";
import Chart, { useChartDimensions } from "./chart";

type Entry = {
    title: string;
    values: number[];
    color: string;
}

type Props = {
    data: Entry[];
};

export function BarChart({ data }: Props) {
    const { width: chartWidth, height: chartHeight, isHydrated } = useChartDimensions('bar-chart-root', 0, 120);

    const paddingLeft = 45;   // Increased to give text titles room on the left side
    const paddingBottom = 24; // Space for X-axis numbers at the bottom
    const paddingTop = 12;
    const paddingRight = 26;  // Padding on the far right to prevent max bars from clipping

    const usableWidth = chartWidth - paddingLeft - paddingRight;
    const usableHeight = chartHeight - paddingTop - paddingBottom;

    // Extract maximum ceiling metrics across all nested values
    const allValues = data.flatMap((entry) => entry.values);
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;

    // Setup helper ticks for vertical split gridlines (X-axis milestones)
    const gridLinesCount = 4;
    const gridTicks = Array.from({ length: gridLinesCount + 1 }, (_, i) => i / gridLinesCount);

    return (
        <div
            id="bar-chart-root"
            className="w-full h-48 p-4 relative"
        >
            <div
                id="bar-chart-wrapper"
                className="relative w-full h-full select-none"
            >
                {isHydrated && (
                    <>
                        {/* 2. BACKGROUND: Grid Lines (X and Y) and X-Axis Scale Value Labels */}
                        <div className="absolute inset-0 pointer-events-none">

                            {/* VERTICAL GRID LINES & X-AXIS LABELS */}
                            {gridTicks.map((ratio, i) => {
                                const leftPosition = paddingLeft + (ratio * usableWidth);
                                const labelValue = Math.round(ratio * maxValue);

                                return (
                                    <div
                                        key={`x-grid-${i}`}
                                        className="absolute top-0 bottom-0 flex flex-col items-center"
                                        style={{ left: `${leftPosition}px` }}
                                    >
                                        {/* Vertical line matching chart bounds */}
                                        <div
                                            className="w-0 border-l border-gray-100 opacity-60 h-full"
                                            style={{ paddingBottom: `${paddingBottom}px`, paddingTop: `${paddingTop}px` }}
                                        />
                                        {/* X-Axis Metric Number Label */}
                                        <span
                                            className="text-[10px] text-gray-400 font-medium text-center absolute"
                                            style={{ bottom: '0px', transform: 'translateX(-50%)', height: `${paddingBottom - 6}px` }}
                                        >
                                            {labelValue}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* HORIZONTAL GRID LINES (Y-Axis Splits behind rows) */}
                            {/* <div
                                className="absolute inset-0 flex flex-col justify-between"
                                style={{
                                    left: `${paddingLeft}px`,
                                    bottom: `${paddingBottom}px`,
                                    top: `${paddingTop}px`,
                                    right: `${paddingRight}px`
                                }}
                            >
                                {data.map((_, index) => (
                                    <div
                                        key={`y-grid-${index}`}
                                        className="flex-1 w-full flex items-center"
                                    >
                                        <div className="w-full border-b border-gray-100 opacity-60 border-dashed" />
                                    </div>
                                ))}
                            </div> */}
                        </div>

                        {/* 3. FOREGROUND: Scaled Horizontal Data Bars */}
                        <div
                            className="absolute inset-0 flex flex-col justify-between gap-2"
                            style={{ left: '0px', top: `${paddingTop}px`, bottom: `${paddingBottom}px`, right: `${paddingRight}px` }}
                        >
                            {data.map((entry, index) => (
                                <div
                                    key={index}
                                    className="flex items-center flex-1 w-full relative"
                                    style={{ paddingLeft: `${paddingLeft}px` }}
                                >
                                    {/* Y-Axis Title Placement (Positioned on the Left) */}
                                    <span
                                        className="absolute left-0 text-[10px] text-gray-400 font-medium truncate text-end pr-3 select-none"
                                        style={{ width: `${paddingLeft}px` }}
                                    >
                                        {entry.title}
                                    </span>

                                    {/* Sub-group Container for Bars growing Left-to-Right */}
                                    <div className="flex flex-col justify-center gap-1 h-full w-full">
                                        {entry.values.map((val, idx) => {
                                            // Scale width dynamically instead of height
                                            const scaledWidth = (val / maxValue) * usableWidth;
                                            return (
                                                <div
                                                    key={idx}
                                                    className="h-full max-h-[12px] rounded-r-sm transition-all duration-300 hover:opacity-80"
                                                    style={{
                                                        width: `${scaledWidth}px`,
                                                        backgroundColor: entry.color
                                                    }}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}