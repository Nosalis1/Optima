import { type DashboardData } from '@/app/domain';
import { Card } from '@/app/components/cards/card';
import { LineGraph } from '@/src/components/graphs';

type Props = {
    data: DashboardData;
};

export default function DashboardGraphs({ data }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Card header={{
                title: "Throughput",
                description: "Requests per second",
                tooltip: "The number of HTTP requests processed by the server during the last measurement interval. Higher values indicate increased traffic."
            }}>
                <LineGraph
                    data={[
                        {
                            points: data.history.rps.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-6)",
                            type: 'solid',
                            label: "RPS"
                        },
                        {
                            points: data.charts.throughput.errorClient.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-4)",
                            type: 'dashed',
                            label: "Client Errors (4xx)"
                        },
                        {
                            points: data.charts.throughput.errorServer.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-5)",
                            type: 'dashed',
                            label: "Server Errors (5xx)"
                        }
                    ]}
                    withDots={false}
                />
            </Card>

            <Card header={{
                title: "Latency",
                description: "Response time percentiles",
                tooltip: "Percentile response times. Shows how fast most users experience the system. Example: 50% of users waited less than 30ms, 95% waited less than 100ms, and 99% waited less than 200ms."
            }}>
                <LineGraph
                    data={[
                        {
                            points: data.charts.percentiles.p50.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-1)",
                            type: 'dashed',
                            label: "P50 ms",
                            fillArea: false
                        },
                        {
                            points: data.charts.percentiles.p95.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-2)",
                            type: 'dashed',
                            label: "P95 ms",
                            fillArea: false
                        },
                        {
                            points: data.charts.percentiles.p99.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-4)",
                            type: 'dashed',
                            label: "P99 ms",
                            fillArea: false
                        }
                    ]}
                    withDots={false}
                />
            </Card>

            <Card header={{
                title: "Memory Usage",
                description: "Heap memory usage and size",
                tooltip: "Current JavaScript heap memory usage compared to the allocated heap limit."
            }}>
                <LineGraph
                    data={[
                        {
                            points: data.charts.runtimePerformance.heapUsage.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-1)",
                            type: 'solid',
                            label: "heapUsed",
                            fillArea: false
                        },
                        {
                            points: data.charts.runtimePerformance.heapSize.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-2)",
                            type: 'dashed',
                            label: "heapTotal"
                        }
                    ]}
                    withDots={false}
                />
            </Card>

            <Card header={{
                title: "Event Loop Lag",
                description: "Event loop lag over time",
                tooltip: "Delay between scheduled Node.js tasks and their actual execution time. High values indicate that the server is blocked by CPU-heavy operations or synchronous code."
            }}>
                <LineGraph
                    data={[
                        {
                            points: data.charts.runtimePerformance.lag.map((value, index) => ({ x: index, y: value })),
                            color: "var(--chart-4)",
                            type: 'solid',
                            label: "lag",
                            fillArea: false
                        }
                    ]}
                    withDots={false}
                />
            </Card>
        </div>
    );
}