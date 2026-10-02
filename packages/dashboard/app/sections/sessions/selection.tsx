import { Card } from "@/app/components/cards/card";
import type { Incident, SessionRouteImpact, SessionSummary, SessionSummaryPoint } from "../../domain";
import { DownloadIcon } from "@/app/components/shared/icons";
import { Hero, HeroHeader } from '../../components/cards/hero';
import { LineGraph } from "../../../src/components/graphs/index";
import { DataTable, type Column } from "@/src/components/tables/DataTable";
import { formatBigNumber } from "@/src/utility/number";
import { useMetrics } from "@/app/context/metrics.context";

type Props = {
    selected: SessionSummary | null;
};

type SeriesPoint = { x: number; y: number | null };

const STATUS_COLOR: Record<SessionSummary['status'], string> = {
    RUNNING: 'var(--chart-6)',
    COMPLETED: 'var(--chart-3)',
    INTERRUPTED: 'var(--chart-4)',
};

const INCIDENT_COLOR: Record<Incident['status'], string> = {
    FIRING: 'border-[var(--chart-5)]',
    RESOLVED: 'border-[var(--chart-1)]',
};

const ROUTE_COLUMNS: Column<SessionRouteImpact>[] = [
    { header: 'Method', render: route => <span className="font-semibold">{route.method}</span> },
    { header: 'Route', render: route => route.route },
    { header: 'Impacted', numeric: true, render: route => formatBigNumber(route.impactedRequests) },
    { header: 'Requests', numeric: true, render: route => formatBigNumber(route.requestCount) },
    { header: 'P95', numeric: true, render: route => `${route.p95.toFixed(1)} ms` },
    { header: '5xx', numeric: true, render: route => `${(route.serverErrorRate * 100).toFixed(2)} %` },
];

function formatDuration(ms: number): string {
    const totalSeconds = Math.round(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

const formatDateTime = (iso: string | null) => iso ? new Date(iso).toLocaleString() : 'In Progress';
const formatPercent = (fraction: number) => `${(fraction * 100).toFixed(2)}`;

function toSeries(summary: SessionSummary, pick: (p: SessionSummaryPoint) => number): SeriesPoint[] {
    const start = Date.parse(summary.windowStart);
    const step = summary.series.resolutionMs;
    const out: SeriesPoint[] = [];
    let previous: number | null = null;
    for (const p of summary.series.points) {
        const x = (Date.parse(p.startTime) - start) / 1000;
        if (previous !== null && x - previous > (step / 1000) * 1.5) out.push({ x: previous + step / 1000, y: null });
        out.push({ x, y: pick(p) });
        previous = x;
    }
    return out;
}

export function Selection({ selected }: Props) {

    const { downloadSession } = useMetrics();

    if (!selected) {
        return (
            <div className="flex flex-col h-full w-full items-center justify-center">
                <p className="text-sm text-gray-500">No session selected</p>
            </div>
        );
    }

    const windowStart = Date.parse(selected.windowStart);
    const formatClock = (value: number) =>
        new Date(windowStart + value * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const { quality } = selected;
    const openIncidents = selected.incidents.filter(i => i.status === 'FIRING').length;

    return (
        <div className="flex flex-col h-full w-full gap-2 pb-4">
            <Card padding>
                <div className="flex flex-col gap-1 w-full">
                    <div className="flex w-full justify-between">
                        <p className="text-sm font-medium text-gray-700">
                            Session {selected.sessionNumber}
                            <span className="ml-2 text-xs font-semibold" style={{ color: STATUS_COLOR[selected.status] }}>{selected.status}</span>
                        </p>
                        <div className="flex items-center gap-1 cursor-pointer" onClick={() => downloadSession(selected.sessionNumber)}>
                            <p className="text-xs text-gray-500">Download Full</p>
                            <DownloadIcon className="w-4 h-4 text-[var(--color-accent)]" />
                        </div>
                    </div>
                    <div className="flex w-full justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Started: {formatDateTime(selected.startedAt)}</p>
                            <p className="text-xs text-gray-500">Ended: {formatDateTime(selected.endedAt)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-500">Measured: {formatDuration(selected.measuredMs)} in {quality.bucketCount} intervals</p>
                            <p className={`text-xs ${quality.complete ? 'text-gray-500' : 'text-yellow-600'}`}>
                                {quality.complete
                                    ? 'Data complete'
                                    : `Incomplete data: ${quality.missingIntervals} missing intervals, ${quality.conflicts} conflicts`}
                            </p>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Hero>
                    <HeroHeader
                        title="Requests"
                        value={formatBigNumber(selected.traffic.requestCount)}
                        tooltip="Total number of HTTP requests measured in this session."
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="Avg / Peak RPS"
                        value={`${selected.traffic.avgRps.toFixed(1)} / ${selected.traffic.peakRps.toFixed(1)}`}
                        tooltip="Average requests per second over the measured time, and the highest single-interval value."
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="Latency p50 / p95 / p99"
                        value={`${selected.latency.p50.toFixed(0)} / ${selected.latency.p95.toFixed(0)} / ${selected.latency.p99.toFixed(0)}`}
                        unit="ms"
                        tooltip={`Latency percentiles of all requests in the session, from the latency histogram. Slowest request: ${selected.latency.max.toFixed(2)} ms.`}
                    />
                </Hero>
                <Hero>
                    <HeroHeader
                        title="5xx Rate"
                        value={formatPercent(selected.errors.serverErrorRate)}
                        unit={`% (${selected.errors.serverErrorCount}) * 4xx: ${selected.errors.clientErrorCount}`}
                        tooltip="Share of requests that ended with a server error (5xx). Client errors (4xx) are shown separately."
                    />
                </Hero>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <Card header={{ title: "Throughput", description: `Per ${formatDuration(selected.series.resolutionMs)}` }}>
                    <LineGraph
                        data={[
                            { points: toSeries(selected, p => p.rps), color: 'var(--color-accent)', type: 'solid', fillArea: false, label: 'Average RPS' },
                            { points: toSeries(selected, p => p.maxRps), color: 'var(--chart-2)', type: 'dashed', fillArea: false, label: 'Peak RPS' },
                        ]}
                        withDots={false}
                        formatXLabel={formatClock}
                    />
                </Card>
                <Card header={{ title: "Latency & Errors", description: `Per ${formatDuration(selected.series.resolutionMs)}` }}>
                    <LineGraph
                        data={[
                            { points: toSeries(selected, p => p.p95), color: 'var(--chart-2)', type: 'solid', fillArea: false, label: 'P95 ms' },
                            { points: toSeries(selected, p => p.serverErrorCount), color: 'var(--chart-5)', type: 'solid', fillArea: true, label: '5xx' },
                            { points: toSeries(selected, p => p.clientErrorCount), color: 'var(--chart-4)', type: 'dashed', fillArea: false, label: '4xx' },
                        ]}
                        withDots={false}
                        formatXLabel={formatClock}
                    />
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-3">
                    <Card header={{
                        title: "Top routes by Impact",
                        description: "5xx + slow requests",
                        tooltip: "Routes ranked by impacted requests in this session: server errors (5xx) plus requests slower than the slow latency threshold."
                    }}>
                        <DataTable
                            columns={ROUTE_COLUMNS}
                            rows={selected.topRoutes}
                            rowKey={route => `${route.method}:${route.route}`}
                            emptyText="No impacted routes."
                        />
                    </Card>
                </div>
                <div className="md:col-span-2">
                    <Card header={{
                        title: "Incidents",
                        description: `${selected.incidents.length} total${openIncidents > 0 ? `, ${openIncidents} open` : ''}`
                    }}>
                        {selected.incidents.length === 0 && <p className="text-sm text-gray-500 p-4">No incidents.</p>}
                        {selected.incidents.map(incident => (
                            <div key={incident.incidentId} className={`flex flex-col p-2 border-l-3 ${INCIDENT_COLOR[incident.status]} m-2`}>
                                <p className="text-sm text-foreground">{incident.title} * {incident.status}</p>
                                <p className="text-xs text-accent-soft">
                                    {formatDateTime(incident.firedAt)}
                                    {incident.resolvedAt ? ` - ${new Date(incident.resolvedAt).toLocaleTimeString()}` : ''}
                                    {` * peak ${incident.peakValue.toFixed(2)} ${incident.unit} * ${incident.severity}`}
                                </p>
                            </div>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    );
}
