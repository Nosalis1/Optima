import { type EndpointTelemetry, type IncidentRuleStatus, type IncidentsSnapshot, type IncidentState } from '@/app/domain';
import { Card } from '@/app/components/cards/card';
import { SmallTable } from '@/src/components/tables/SmallTable';

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

function ImpactTable({ data }: { data: EndpointTelemetry[] }) {

    const remapData = data.map((item) => ({
        "METHOD": item.method,
        "ROUTE": item.route,
        "IMPACTED": item.impactedRequests ?? 0,
        "RPS": item.rps.toFixed(1),
        "P95": `${item.p95.toFixed(2)} ms`,
        "ERR%": `${(item.errorRate * 100).toFixed(2)} %`,
        "STATUS": item.status
    }));

    return (
        <Card header={{
            title: "Top routes by Impact",
            description: "5xx + slow requests",
            tooltip: "Routes ranked by impacted requests in the recent window: server errors (5xx) plus requests slower than the slow latency threshold."
        }}>
            <SmallTable
                columns={["METHOD", "ROUTE", "IMPACTED", "RPS", "P95", "ERR%", "STATUS"]}
                data={remapData}
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