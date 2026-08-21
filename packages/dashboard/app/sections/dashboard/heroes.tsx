import { type DashboardData } from '@/app/domain';
import LineShowcase from '@/src/components/graphs/line-showcase';
import { Hero, HeroHeader } from '../../components/cards/hero';
import { formatBigNumber } from '@/src/utility/number';

type Props = {
    data: DashboardData;
};

export default function DashboardHeroes({ data }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Hero>
                <HeroHeader
                    title="CURRENT RPS"
                    value={formatBigNumber(data.current.rps)}
                    unit="req/s"
                    color="var(--chart-6)"
                    tooltip="The number of HTTP requests processed by the server during the last measurement interval. Higher values indicate increased traffic."
                />
                <LineShowcase
                    data={{
                        points: data.history.rps.map((value, index) => ({ x: index, y: value })),
                        color: "var(--chart-6)",
                        type: 'solid'
                    }}
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title="AVG LATENCY"
                    value={data.current.latency}
                    unit="ms"
                    color="var(--chart-2)"
                    tooltip="Average response time of all processed requests. Shows how long users wait for server responses."
                />
                <LineShowcase
                    data={{
                        points: data.history.latency.map((value, index) => ({ x: index, y: value })),
                        color: "var(--chart-2)",
                        type: 'solid'
                    }}
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title="ERROR RATE"
                    value={data.current.errorRate}
                    unit="%"
                    color="var(--chart-5)"
                    tooltip="Percentage of requests that failed with an HTTP error response. Includes client errors (4xx) and server errors (5xx)."
                />
                <LineShowcase
                    data={{
                        points: data.history.errorRate.map((value, index) => ({ x: index, y: value })),
                        color: "var(--chart-5)",
                        type: 'solid'
                    }}
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title="EVENT LOOP LAG"
                    value={data.current.eventLoopLag}
                    unit="ms"
                    color="var(--chart-4)"
                    tooltip="Delay between scheduled Node.js tasks and their actual execution time. High values indicate that the server is blocked by CPU-heavy operations or synchronous code."
                />
                <LineShowcase
                    data={{
                        points: data.history.eventLoopLag.map((value, index) => ({ x: index, y: value })),
                        color: "var(--chart-4)",
                        type: 'solid'
                    }}
                />
            </Hero>

            <Hero>
                <HeroHeader
                    title="HEAP USAGE"
                    value={data.current.heapUsage}
                    color="var(--chart-1)"
                    unit="MB"
                    tooltip="Current JavaScript heap memory usage compared to the allocated heap limit."
                />
                <LineShowcase
                    data={{
                        points: data.history.heapUsage.map((value, index) => ({ x: index, y: value })),
                        color: "var(--chart-1)",
                        type: 'solid'
                    }}
                />
            </Hero>
        </div >
    );
}