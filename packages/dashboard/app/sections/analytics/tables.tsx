import { Card } from '@/app/components/cards/card';
import { type AnalyticsData } from '@/app/domain';
import { AnalyticsFilterSettings } from '../../context/metrics.context';
import { formatBigNumber } from '@/src/utility/number';

type Props = {
    data: AnalyticsData;
    filters: AnalyticsFilterSettings;
    onFilterChange?: (settings: Partial<AnalyticsFilterSettings>) => void;
};

function Filters({ settings, onChange }: { settings: AnalyticsFilterSettings; onChange?: (settings: Partial<AnalyticsFilterSettings>) => void }) {
    const methods = ['ALL', 'GET', 'POST', 'PUT', 'DELETE'];
    const statuses = ['ALL', '2xx', '4xx', '5xx'];
    const timeRanges = ['ALL', '5m', '15m', '30m', '1h', '6h', '12h', '24h'];

    return (
        <Card padding>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-row gap-4 items-end w-full">

                <div className="w-full sm:col-span-2 lg:flex-1">
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full bg-background text-foreground px-3 py-2 rounded-md border border-border focus:outline-none focus:border-accent text-sm"
                    />
                </div>

                <div className="flex flex-col w-full lg:w-40">
                    <span className="text-[10px] font-bold text-accent-soft tracking-wider mb-1 uppercase">METHOD</span>
                    <select className="w-full bg-background text-foreground px-3 py-2 rounded-md border border-border focus:outline-none focus:border-accent text-sm cursor-pointer" onChange={(e) => onChange && onChange({ method: e.target.value as AnalyticsFilterSettings['method'] })}>
                        {methods.map((method) => (
                            <option key={method} value={method}>
                                {method}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col w-full lg:w-40">
                    <span className="text-[10px] font-bold text-accent-soft tracking-wider mb-1 uppercase">STATUS</span>
                    <select className="w-full bg-background text-foreground px-3 py-2 rounded-md border border-border focus:outline-none focus:border-accent text-sm cursor-pointer" onChange={(e) => onChange && onChange({ status: e.target.value as AnalyticsFilterSettings['status'] })}>
                        {statuses.map((status) => (
                            <option key={status} value={status}>
                                {status}
                            </option>
                        ))}
                    </select>
                </div>

            </div>
        </Card>
    );
}

function Content({ data }: { data: AnalyticsData['endpointsTable'] }) {
    const headers = ['#', 'Method', 'Route', 'Req Count', 'Avg Latency', 'P95', 'P99', 'Error Percentage'];
    return (
        <Card padding>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead>
                        <tr>
                            {
                                headers.map((header) => (
                                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-accent-soft uppercase tracking-wider">
                                        {header}
                                    </th>
                                ))
                            }
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {data.data.map((row, index) => (
                            <tr key={index}>
                                {/* //! Add rest of the columns */}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{index + 1}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.method}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.route}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{formatBigNumber(row.requestCount)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.averageLatency?.toFixed(2)} ms</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.p95?.toFixed(2)} ms</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.p99?.toFixed(2)} ms</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.errorRate?.toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}

function Pagination({ data }: { data: AnalyticsData['endpointsTable'] }) {
    const current = data.pagination.page;
    const pages = [current - 2, current - 1, current, current + 1, current + 2].filter(p => p > 0 && p <= (data.pagination.totalCount / data.pagination.perPageCount));

    return (
        <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-accent-soft">Showing {data.data.length} of {data.pagination.totalCount} entries</span>
            <div className="flex gap-2">
                <button className="bg-card text-foreground px-3 py-1 rounded-md">Previous</button>
                {
                    pages.map((page) => (
                        <button key={page} className={`bg-card text-foreground px-3 py-1 rounded-md ${page === current ? 'bg-[#3B82F6]' : ''}`}>{page}</button>
                    ))
                }
                <button className="bg-card text-foreground px-3 py-1 rounded-md">Next</button>
            </div>
        </div>
    )
}

export default function AnalyticsTables({ data, filters, onFilterChange }: Props) {
    return (
        <div className="flex flex-col gap-4 pt-4 md:mt-0 md:col-span-2">
            <Filters settings={filters} onChange={onFilterChange} />
            <Content data={data.endpointsTable} />
            <Pagination data={data.endpointsTable} />
        </div>
    );
}