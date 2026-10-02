import { type EndpointTelemetry, type IncidentRuleStatus, type IncidentsSnapshot, type IncidentState } from '@/app/domain';
import { Card } from '@/app/components/cards/card';
import { DataTable, StatusText, type Column } from '@/src/components/tables/DataTable';
import { formatBigNumber } from '@/src/utility/number';

type Props = {
    impactEndpoints: EndpointTelemetry[];
    incidents: IncidentsSnapshot;
};

const STATE_COLOR: Record<IncidentState, string> = {
    NORMAL: 'border-[var(--chart-6)]',
    PENDING: 'border-[var(--chart-3)]',
    FIRING: 'border-[var(--chart-5)]',
    RESOLVED: 'border-[var(--chart-1)]',
};

const formatValue = (value: number | null, unit: string) =>
    value === null ? 'n/a' : `${value.toFixed(unit === '%' ? 2 : 1)} ${unit}`;

const formatTime = (iso: string | null) => iso ? new Date(iso).toLocaleTimeString() : '';

function RuleRow({ rule }: { rule: IncidentRuleStatus }) {
    return (
        <div className={`flex flex-col p-2 border-l-3 ${STATE_COLOR[rule.state]} m-2`}>
            <div className="flex justify-between text-sm text-foreground">
                <span>{rule.title}</span>
                <span className="font-semibold">{rule.state}</span>
            </div>
            <p className="text-xs text-accent-soft">
                {rule.valid
                    ? `${formatValue(rule.value, rule.unit)} / limit ${formatValue(rule.threshold, rule.unit)}`
                    : `no valid data (${rule.reason ?? 'n/a'})`}
                {rule.since && rule.state !== 'NORMAL' ? ` * since ${formatTime(rule.since)}` : ''}
            </p>
        </div>
    );
}

function IncidentsTable({ data }: { data: IncidentsSnapshot }) {
    return (
        <Card header={{ title: "Incidents", description: "Rule state" }}>
            {data.rules.map(rule => <RuleRow rule={rule} key={rule.ruleId} />)}
            {
                data.incidents.map(incident => (
                    <div key={incident.incidentId} className={`flex flex-col p-2 border-l-3 ${STATE_COLOR[incident.status]} m-2`}>
                        <p className="text-sm text-foreground">{incident.title} * {incident.status}</p>
                        <p className="text-xs text-accent-soft">
                            {formatTime(incident.firedAt)}{incident.resolvedAt ? ` - ${formatTime(incident.resolvedAt)}` : ''}
                            {` * peak ${formatValue(incident.peakValue, incident.unit)} * ${incident.severity}`}
                        </p>
                        {
                            incident.relatedFindings.length > 0 && (
                                <p className="text-xs text-accent-soft">
                                    Changed together: {incident.relatedFindings.map(f => f.pairId).join(', ')}. {incident.causeNote}
                                </p>
                            )
                        }
                    </div>
                ))
            }
        </Card>
    );
}

const IMPACT_COLUMNS: Column<EndpointTelemetry>[] = [
    { header: 'Method', render: row => <span className="font-semibold">{row.method}</span> },
    { header: 'Route', render: row => row.route },
    { header: 'Impacted', numeric: true, render: row => formatBigNumber(row.impactedRequests ?? 0) },
    { header: 'RPS', numeric: true, render: row => row.rps.toFixed(1) },
    { header: 'P95', numeric: true, render: row => `${row.p95.toFixed(1)} ms` },
    { header: 'Errors', numeric: true, render: row => `${(row.errorRate * 100).toFixed(2)} %` },
    { header: 'Status', render: row => <StatusText label={row.status ?? ''} color={row.status === 'HEALTHY' ? 'var(--chart-3)' : 'var(--chart-5)'} /> },
];

function ImpactTable({ data }: { data: EndpointTelemetry[] }) {
    return (
        <Card header={{
            title: "Top routes by Impact",
            description: "5xx + slow requests",
            tooltip: "Routes ranked by impacted requests in the recent window: server errors (5xx) plus requests slower than the slow latency threshold."
        }}>
            <DataTable
                columns={IMPACT_COLUMNS}
                rows={data}
                rowKey={row => `${row.method}:${row.route}`}
                emptyText="No impacted routes."
            />
        </Card>
    );
}

export default function DashboardTables({ impactEndpoints, incidents }: Props) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div className="col-span-3 md:col-span-3">
                <ImpactTable data={impactEndpoints} />
            </div>
            <div className="col-span-2 md:col-span-2">
                <IncidentsTable data={incidents} />
            </div>
        </div>
    );
}