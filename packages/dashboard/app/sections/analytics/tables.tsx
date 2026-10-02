import { Card } from '@/app/components/cards/card';
import { type AnalyticsData } from '@/app/domain';
import { AnalyticsFilterSettings } from '../../context/metrics.context';
import { formatBigNumber } from '@/src/utility/number';
import React from 'react';
import { DataTable, StatusText, type Column } from '@/src/components/tables/DataTable';

type Props = {
    data: AnalyticsData;
    filters: AnalyticsFilterSettings;
    onFilterChange?: (settings: Partial<AnalyticsFilterSettings>) => void;
};

const METHODS: AnalyticsFilterSettings['method'][] = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];

const inputClass = "bg-background text-foreground px-3 py-2 rounded-md border border-border focus:outline-none focus:border-accent text-sm";

function Filters({ settings, onChange }: { settings: AnalyticsFilterSettings; onChange?: (settings: Partial<AnalyticsFilterSettings>) => void }) {
    const [query, setQuery] = React.useState(settings.query);
    React.useEffect(() => {
        const handler = setTimeout(() => {
            if (query !== settings.query) {
                onChange?.({ query, page: 1 });
            }
        }, 300);
        return () => clearTimeout(handler);
    }, [query, settings.query, onChange]);

    return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
                type="text"
                placeholder="Search route..."
                className={`${inputClass} sm:w-64`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <select
                className={`${inputClass} cursor-pointer sm:w-32`}
                value={settings.method}
                onChange={(e) => onChange?.({ method: e.target.value as AnalyticsFilterSettings['method'], page: 1 })}
            >
                {METHODS.map((method) => (
                    <option key={method} value={method}>{method === 'ALL' ? 'All methods' : method}</option>
                ))}
            </select>
        </div>
    );
}

type EndpointRow = AnalyticsData['endpointsTable']['data'][number];

function Content({ data, offset }: { data: EndpointRow[]; offset: number }) {
    const columns: Column<EndpointRow>[] = [
        { header: '#', numeric: true, render: (_, index) => offset + index + 1 },
        { header: 'Method', render: row => <span className="font-semibold">{row.method}</span> },
        { header: 'Route', render: row => row.route },
        { header: 'Requests', numeric: true, render: row => formatBigNumber(row.requestCount) },
        { header: 'Impacted', numeric: true, render: row => formatBigNumber(row.impactedRequests ?? 0) },
        { header: 'Avg', numeric: true, render: row => `${row.averageLatency?.toFixed(1)} ms` },
        { header: 'P95', numeric: true, render: row => `${row.p95.toFixed(1)} ms` },
        { header: 'P99', numeric: true, render: row => `${row.p99?.toFixed(1)} ms` },
        { header: 'Errors', numeric: true, render: row => `${(row.errorRate * 100).toFixed(2)} %` },
        { header: 'Status', render: row => <StatusText label={row.status ?? ''} color={row.status === 'HEALTHY' ? 'var(--chart-3)' : 'var(--chart-5)'} /> },
    ];

    return (
        <DataTable
            columns={columns}
            rows={data}
            rowKey={row => `${row.method}:${row.route}`}
            emptyText="No routes match the current filters."
        />
    );
}

function Pagination({ meta, shown, onChange }: { meta: AnalyticsData['endpointsTable']['pagination']; shown: number; onChange: (page: number) => void }) {
    const totalPages = Math.max(1, Math.ceil(meta.totalCount / meta.pageSize));
    const current = Math.min(meta.page, totalPages);
    const from = meta.totalCount === 0 ? 0 : (current - 1) * meta.pageSize + 1;
    const to = (current - 1) * meta.pageSize + shown;
    const buttonClass = "px-3 py-1 rounded-md text-sm text-foreground bg-[var(--variant-3)] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

    return (
        <div className="flex justify-between items-center px-4 py-3 border-t border-border">
            <span className="text-sm text-accent-soft">{from}-{to} of {meta.totalCount} routes</span>
            <div className="flex items-center gap-2">
                <button className={buttonClass} onClick={() => onChange(current - 1)} disabled={current <= 1}>Previous</button>
                <span className="text-sm text-accent-soft">Page {current} of {totalPages}</span>
                <button className={buttonClass} onClick={() => onChange(current + 1)} disabled={current >= totalPages}>Next</button>
            </div>
        </div>
    );
}

export default function AnalyticsTables({ data, filters, onFilterChange }: Props) {
    const { data: rows, pagination } = data.endpointsTable;

    return (
        <div className="mt-4">
            <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 pt-4 pb-2">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Endpoints</p>
                        <p className="text-xs text-accent-soft">Recent window * impacted = 5xx + slow requests</p>
                    </div>
                    <Filters settings={filters} onChange={onFilterChange} />
                </div>
                <Content data={rows} offset={(pagination.page - 1) * pagination.pageSize} />
                <Pagination meta={pagination} shown={rows.length} onChange={(page) => onFilterChange?.({ page })} />
            </Card>
        </div>
    );
}
