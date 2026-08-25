"use client";
import Histogram from "@/src/components/graphs/histogram";
import {
    HistogramGraph,
    BarGraph,
    LineGraph,
    ScatterGraph,
    Heatmap,
    GaugeGraph
} from "../../src/components/graphs";
import { Card } from "./cards/card";

const Screen = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex flex-col w-full h-screen overflow-hidden">
            {/* <Header /> */}
            <div className="flex flex-row w-full h-full overflow-hidden">
                {/* <Sidebar /> */}
                <div className="flex flex-col w-full h-full overflow-auto">
                    <div className="p-6">
                        {children}
                    </div>
                    {/* <Footer /> */}
                </div>
            </div>
        </div>
    )
}

//#region Mocking
function random(min: number, max: number) {
    return Math.random() * (max - min) + min;
}
function randomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = Math.floor(random(60, 100));
    const lightness = Math.floor(random(40, 70));
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}
function randomXY(count: number, xMin: number, xMax: number, yMin: number, yMax: number) {
    const points = [];
    for (let i = 0; i < count; i++) {
        const x = Math.round(random(xMin, xMax));
        const y = Math.round(random(yMin, yMax));
        points.push({ x, y });
    }
    return points;
}
function randomScatterDataSet(count: number, xMin: number, xMax: number, yMin: number, yMax: number, color: string = randomColor()) {
    const baseLine = randomXY(count, xMin, xMax, yMin, yMax);

    const points = baseLine.map(point => {
        const offsetX = random(-1, 1);
        const offsetY = random(-5, 5);
        return {
            x: point.x + offsetX,
            y: point.y + offsetY
        };
    });

    return { points, color, label: `Series ${Math.floor(Math.random() * 100)}` };
}
const HEATMAP_X_LABELS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O"];
const HEATMAP_Y_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15"];
function randomHeatmapDataSet(xLabels: string[], yLabels: string[]) {
    const data = [];
    for (const x of xLabels) {
        for (const y of yLabels) {
            const value = Math.round(random(0, 100));
            data.push({ y, x, value });
        }
    }
    return data;
}
//#endregion

export default function TestScreen() {
    const cpuThresholds = [
        { from: 0, to: 70, color: "#10b981", label: "Normal" },
        { from: 70, to: 90, color: "#f59e0b", label: "Warning" },
        { from: 90, to: 100, color: "#ef4444", label: "Danger" },
    ];

    const colorPalette = [
        { color: 'var(--chart-1)', label: '#34D399', use: 'osnovni sistemski parametri i CPU' },
        { color: 'var(--chart-2)', label: '#818CF8', use: 'memorija i RAM' },
        { color: 'var(--chart-3)', label: '#6EE7B7', use: 'uspešni zahtevi i success rate' },
        { color: 'var(--chart-4)', label: '#FBBF24', use: 'Event Loop lag' },
        { color: 'var(--chart-5)', label: '#F87171', use: 'kritične greške i anomalije' },
        { color: 'var(--chart-6)', label: '#2DD4BF', use: 'aktivni handle-ovi i mrežni saobraćaj' },
    ]

    return (
        <Screen>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Card>
                    <ScatterGraph
                        data={[
                            randomScatterDataSet(100, 0, 20, 0, 100, 'var(--chart-3)'),
                            randomScatterDataSet(150, 1, 20, 0, 100, 'var(--chart-5)'),
                        ]}
                    />
                </Card>
            </div>
        </Screen>
    );

    return (
        <html lang="sr">
            <body className="flex min-h-screen text-brand-50 antialiased">
                <div className="flex flex-col w-full h-full overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 m-4">
                        <Card>
                            <div className="min-h-[200px]">
                                <LineGraph
                                    data={[
                                        {
                                            points: randomXY(10, 1, 20, 0, 100),
                                            color: randomColor(),
                                            type: 'solid',
                                            fillArea: false
                                        },
                                        {
                                            points: randomXY(10, 1, 20, 0, 100),
                                            color: randomColor(),
                                            type: 'dashed',
                                            fillArea: false
                                        },
                                    ]}
                                />
                            </div>
                            {/* <BarGraph
                                categories={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                                data={[
                                    {
                                        label: "Series 1",
                                        values: [10, 20, 30],
                                        color: randomColor()
                                    },
                                    {
                                        label: "Series 2",
                                        values: [15, 25, 35],
                                        color: randomColor()
                                    },
                                    {
                                        label: "Series 3",
                                        values: [5, 15, 25],
                                        color: randomColor()
                                    }
                                ]}
                            /> */}

                        </Card>


                        {/* {
                            colorPalette.map((item, index) => (
                                <div key={index} className="flex items-center justify-center h-24 rounded-lg" style={{ backgroundColor: item.color }}>
                                    <span className="text-white font-semibold">{item.label}</span>
                                    <span className="text-white ml-2">{item.use}</span>
                                </div>
                            ))
                        } */}

                        {/* <GaugeGraph
                            current={75}
                            from={0}
                            to={100}
                            variant="half"
                            title="Half Gauge"
                            unit="%"
                            progressColor={randomColor()}
                            safeAreas={cpuThresholds}
                        />

                        <GaugeGraph
                            current={50}
                            from={0}
                            to={100}
                            variant="full"
                            title="Full Gauge"
                            unit="%"
                            progressColor={randomColor()}
                            safeAreas={cpuThresholds}
                        />


                        <HistogramGraph
                            data={randomXY(100, 0, 20, 0, 100).map(p => p.y)}
                            barColor={randomColor()}
                        />
                        <LineGraph
                            data={[
                                {
                                    points: randomXY(10, 1, 20, 0, 100),
                                    color: randomColor(),
                                    type: 'solid',
                                    fillArea: false
                                },
                                {
                                    points: randomXY(10, 1, 20, 0, 100),
                                    color: randomColor(),
                                    type: 'dashed',
                                    fillArea: false
                                },
                            ]}
                        />
                        <LineGraph
                            data={[
                                {
                                    points: randomXY(10, 1, 20, 0, 100),
                                    color: randomColor(),
                                    type: 'solid',
                                    fillArea: true,
                                    label: 'A'
                                },
                                {
                                    points: randomXY(10, 1, 20, 0, 100),
                                    color: randomColor(),
                                    type: 'dashed',
                                    fillArea: true,
                                    label: 'B'
                                },
                            ]}
                        />
                        <ScatterGraph
                            data={[
                                randomScatterDataSet(100, 0, 20, 0, 100),
                                randomScatterDataSet(150, 1, 20, 0, 100),
                            ]}
                        />
                        <Heatmap
                            xAxisLabels={HEATMAP_X_LABELS}
                            yAxisLabels={HEATMAP_Y_LABELS}
                            data={randomHeatmapDataSet(HEATMAP_X_LABELS, HEATMAP_Y_LABELS)}
                        /> */}
                    </div>

                </div>
            </body>
        </html>
    );
}