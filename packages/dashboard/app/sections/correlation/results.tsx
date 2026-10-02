import { Card } from '@/app/components/cards/card';
import type { CorrelationData } from '../../domain';
import { DataTable, StatusText, type Column } from '@/src/components/tables/DataTable';
import { DIRECTION_SYMBOL, STATUS_COLOR, STATUS_LABEL, formatR } from './labels';

type Row = CorrelationData['results'][number];

type Props = {
    results: CorrelationData['results'];
    selectedId: string | null;
    onSelect?: (id: string) => void;
}

const COLUMNS: Column<Row>[] = [
    { header: 'Pair', render: row => `${row.xLabel} → ${row.yLabel}` },
    { header: 'Status', render: row => <StatusText label={STATUS_LABEL[row.analysis.status]} color={STATUS_COLOR[row.analysis.status]} /> },
    {
        header: 'Dir', render: row => (
            <>
                {DIRECTION_SYMBOL[row.analysis.direction]}
                {row.unexpectedDirection && <span className="ml-1 text-yellow-600" title="Opposite to the expected direction">!</span>}
            </>
        )
    },
    { header: 'Pearson', numeric: true, render: row => formatR(row.analysis.pearsonR) },
    { header: 'Spearman', numeric: true, render: row => formatR(row.analysis.spearmanR) },
    {
        header: 'Eff. N', numeric: true, render: row => {
            const enough = row.analysis.effectiveSampleSize >= row.analysis.requiredSampleSize;
            return (
                <span className={enough ? undefined : 'text-yellow-600'}>
                    {`${Math.round(row.analysis.effectiveSampleSize)} / ${row.analysis.requiredSampleSize}`}
                </span>
            );
        }
    },
    { header: 'Lag', numeric: true, render: row => row.analysis.lag },
];

export function Results({ results, selectedId, onSelect }: Props) {
    return (
        <Card header={{ title: 'Metric pairs', description: 'Select a pair to view details' }}>
            <DataTable
                columns={COLUMNS}
                rows={results}
                rowKey={row => row.id}
                selectedKey={selectedId}
                onRowClick={row => onSelect?.(row.id)}
                emptyText="No correlation results yet."
            />
        </Card>
    );
}
