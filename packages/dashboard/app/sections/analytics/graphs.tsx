import { Card } from '@/app/components/cards/card';
import { BarChart } from '@/src/components/charts/BarChart';
import { type AnalyticsData, type EndpointTelemetry } from '@/app/domain';
import {
    BarGraph,
    Heatmap,
    HistogramGraph,
    ScatterGraph
} from '@/src/components/graphs';
import React from 'react';
import Histogram from '@/src/components/graphs/histogram';

type Props = {
    data: AnalyticsData;
};

export default function AnalyticsGraphs({ data }: Props) {
    const [distributionPage, setDistributionPage] = React.useState(0);
    const distributions = data.latencyDistribution.slice(distributionPage * 5, (distributionPage + 1) * 5);

    // History rows - times, cols - elements

    // function heatmapExtract() {
    //     if (data.history === undefined) return [];
    //     return data.history.flatMap((period, idx) =>
    //         period.map(element => ({
    //             x: idx.toString(),
    //             y: element.route,
    //             value: element.averageLatency ?? 0
    //         })
    //         ));
    // }

    // function scatterExtract() {
    //     const s: { label: string, points: { x: number, y: number }[] } = {
    //     } as { label: string, points: { x: number, y: number }[] };

    //     if (data.history === undefined) return [s];

    //     for (const period of data.history) {
    //         const element = period[0];
    //         if (!element) continue;

    //         s.label = element.route;
    //         s.points.push({
    //             x: element.requestCount ?? 0,
    //             y: element.averageLatency ?? 0
    //         });
    //     }

    //     return [s];
    // }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <Card header={{ title: "Latency Distribution", description: "P50 * P95 * P99" }}>
                <BarGraph
                    categories={distributions.map(item => item.endpoint)}
                    data={[
                        {
                            label: "P50",
                            values: distributions.map(item => item.p50),
                            color: 'var(--chart-3)'
                        },
                        {
                            label: "P95",
                            values: distributions.map(item => item.p95),
                            color: 'var(--chart-4)'
                        },
                        {
                            label: "P99",
                            values: distributions.map(item => item.p99),
                            color: 'var(--chart-5)'
                        }
                    ]}
                />

                <div className="flex justify-center gap-2 mb-2">
                    <button
                        className="px-2 bg-background text-foreground rounded disabled:opacity-50"
                        onClick={() => setDistributionPage(prev => Math.max(prev - 1, 0))}
                        disabled={distributionPage === 0}
                    >
                        {'<'}
                    </button>
                    <button
                        className="px-2 bg-background text-foreground rounded disabled:opacity-50"
                        onClick={() => setDistributionPage(prev => prev + 1)}
                        disabled={(distributionPage + 1) * 5 >= data.latencyDistribution.length}
                    >
                        {'>'}
                    </button>
                </div>
            </Card>

            {/* <Card header={{ title: "Request Load", description: "Last 5min window" }}>
                {
                    data.history.length > 0 &&
                    <ScatterGraph
                        data={scatterExtract()}
                    />
                }

            </Card> */}
        </div>
    );
}