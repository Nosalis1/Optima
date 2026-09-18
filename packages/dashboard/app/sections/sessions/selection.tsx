import { Card } from "@/app/components/cards/card";
import type { SessionSummary } from "../../domain";
import { DownloadIcon } from "@/app/components/shared/icons";
import { Hero, HeroHeader } from '../../components/cards/hero';
import { LineGraph } from "../../../src/components/graphs/index";
import Histogram from "@/src/components/graphs/histogram";
import { useMetrics } from "@/app/context/metrics.context";

type Props = {
    selected: SessionSummary | null;
};

export function Selection({ selected }: Props) {

    const { downloadSession } = useMetrics();

    if (!selected) {
        return (
            <div className="flex flex-col h-full w-full items-center justify-center">
                <p className="text-sm text-gray-500">No session selected</p>
            </div>
        );
    }

    const extractData = (key: keyof typeof selected.perHour[0]) => {
        let points: { x: number, y: number }[] = [];

        if (typeof selected.perHour[0][key] !== 'number') {
            return points;
        }

        selected.perHour.forEach((hour, idx) => {
            points.push({ x: idx, y: hour[key] as number });
        });

        return points;
    };

    return (
        <div className="flex flex-col h-full w-full gap-2">
            <Card padding>
                <div className="flex justify-between">
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex w-full justify-between">
                            <p className="text-sm font-medium text-gray-700">Selected Session: {selected.sessionNumber}</p>
                            <div className="flex items-center gap-1 cursor-pointer" onClick={() => downloadSession(selected.sessionNumber)}>
                                <p className="text-xs text-gray-500">Download Full</p>
                                <DownloadIcon className="w-4 h-4 text-[var(--color-accent)]" />
                            </div>
                        </div>
                        <div className="flex w-full justify-between">
                            <div>
                                <p className="text-xs text-gray-500">Start Time: {selected.startedAt}</p>
                                <p className="text-xs text-gray-500">End Time: {selected.endedAt || "In Progress"}</p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500">Start Window: {selected.windowStart}</p>
                                <p className="text-xs text-gray-500">End Window: {selected.windowEnd}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            <Card padding>
                <LineGraph
                    data={[
                        {
                            points: extractData('avgRps'),
                            color: 'var(--color-accent)',
                            type: 'solid',
                            fillArea: false,
                            label: 'Average RPS'
                        },
                        {
                            points: extractData('maxRps'),
                            color: 'var(--chart-2)',
                            type: 'dashed',
                            fillArea: false,
                            label: 'Maximum RPS'
                        },
                        {
                            points: extractData('clientErrorCount'),
                            color: 'var(--chart-4)',
                            type: 'solid',
                            fillArea: true,
                            label: 'Client Errors'
                        },
                        {
                            points: extractData('serverErrorCount'),
                            color: 'var(--chart-5)',
                            type: 'solid',
                            fillArea: true,
                            label: 'Server Errors'
                        }
                    ]}
                    rows={8}
                    cols={1}
                />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <Hero>
                    <HeroHeader
                        title="Avg RPS"
                        value={selected.avgRps.toFixed(2)}
                        tooltip="Average Requests Per Second during this session."
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="Max RPS"
                        value={selected.maxRps.toFixed(2)}
                        tooltip="Maximum Requests Per Second during this session."
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="Client Errors"
                        value={selected.clientErrorCount.toString()}
                        tooltip="Total number of client-side errors (HTTP 4xx) during this session."
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="Server Errors"
                        value={selected.serverErrorCount.toString()}
                        tooltip="Total number of server-side errors (HTTP 5xx) during this session."
                    />
                </Hero>

                <Hero>
                    <HeroHeader
                        title="Avg Latency"
                        value={selected.avgLatency.toFixed(2) + " ms"}
                        tooltip="Average latency (response time) during this session."
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="Max Latency"
                        value={selected.maxLatency.toFixed(2) + " ms"}
                        tooltip="Maximum latency (response time) during this session."
                    />
                </Hero>
            </div>

            <Card padding>
                <LineGraph
                    data={[
                        {
                            points: extractData('avgLatency'),
                            color: 'var(--color-accent)',
                            type: 'solid',
                            fillArea: false,
                            label: 'Average Latency'
                        },
                        {
                            points: extractData('maxLatency'),
                            color: 'var(--chart-2)',
                            type: 'dashed',
                            fillArea: false,
                            label: 'Maximum Latency'
                        },
                    ]}
                    rows={8}
                    cols={1}
                />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                <Card padding>
                    <Histogram
                        data={extractData('healthyEndpointCount').map(point => point.y)}
                        binCount={24}
                        label="Healthy Endpoints"
                        barColor="var(--chart-3)"
                    />
                </Card>
                <Card padding>
                    <Histogram
                        data={extractData('slowEndpointCount').map(point => point.y)}
                        binCount={24}
                        label="Slow Endpoints"
                        barColor="var(--chart-5)"
                    />
                </Card>
            </div>
        </div>
    );
}