import { Card } from '@/app/components/cards/card';
import { type AnalyticsData } from '@/app/domain';
import { BarGraph } from '@/src/components/graphs';

type Props = {
    data: AnalyticsData;
};

const TOP_ROUTES = 6;

export default function AnalyticsGraphs({ data }: Props) {
    const slowest = [...data.latencyDistribution]
        .sort((a, b) => b.p95 - a.p95)
        .slice(0, TOP_ROUTES);
    const busiest = data.requestVolume.slice(0, TOP_ROUTES);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <Card header={{
                title: "Latency by route",
                description: `Top ${TOP_ROUTES} by P95`,
                tooltip: "Latency percentiles of the routes with the highest P95 in the current window."
            }}>
                {slowest.length > 0 ? (
                    <BarGraph
                        categories={slowest.map(item => item.endpoint)}
                        data={[
                            { label: "P50", values: slowest.map(item => item.p50), color: 'var(--chart-3)' },
                            { label: "P95", values: slowest.map(item => item.p95), color: 'var(--chart-4)' },
                            { label: "P99", values: slowest.map(item => item.p99), color: 'var(--chart-5)' },
                        ]}
                    />
                ) : <p className="text-sm text-accent-soft p-4">No requests in the current window.</p>}
            </Card>

            <Card header={{
                title: "Request volume",
                description: `Top ${TOP_ROUTES} by requests`,
                tooltip: "Number of requests per route in the current window."
            }}>
                {busiest.length > 0 ? (
                    <BarGraph
                        categories={busiest.map(item => item.endpoint)}
                        data={[
                            { label: "Requests", values: busiest.map(item => item.volume), color: 'var(--chart-6)' },
                        ]}
                    />
                ) : <p className="text-sm text-accent-soft p-4">No requests in the current window.</p>}
            </Card>
        </div>
    );
}
