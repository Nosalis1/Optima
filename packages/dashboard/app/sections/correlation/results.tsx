import { Card } from '@/app/components/cards/card';
import type { CorrelationData } from '../../domain';
import { DIRECTION_SYMBOL, STATUS_COLOR, STATUS_LABEL, formatR } from './labels';

type Props = {
    results: CorrelationData['results'];
    selectedId: string | null;
    onSelect?: (id: string) => void;
}

export function Results({ results, selectedId, onSelect }: Props) {
    const headers = ['Pair', 'Status', 'Dir', 'Pearson', 'Spearman', 'Eff. N', 'Lag'];

    return (
        <Card header={{ title: 'Metric pairs', description: 'Select a pair to view details' }}>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                    <thead>
                        <tr>
                            {headers.map((header) => (
                                <th key={header} className="px-4 py-3 text-left text-xs font-medium text-accent-soft uppercase tracking-wider">
                                    {header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {results.map((row) => {
                            const isSelected = row.id === selectedId;
                            const { analysis } = row;
                            const enoughSamples = analysis.effectiveSampleSize >= analysis.requiredSampleSize;
                            return (
                                <tr
                                    key={row.id}
                                    className={`cursor-pointer hover:bg-accent/10 ${isSelected ? 'bg-[var(--variant-3)]' : ''}`}
                                    onClick={() => onSelect?.(row.id)}
                                >
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">{`${row.xLabel} → ${row.yLabel}`}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold" style={{ color: STATUS_COLOR[analysis.status] }}>
                                        {STATUS_LABEL[analysis.status]}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-accent-soft">
                                        {DIRECTION_SYMBOL[analysis.direction]}
                                        {row.unexpectedDirection && <span className="ml-1 text-yellow-600" title="Opposite to the expected direction">!</span>}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-accent-soft">{formatR(analysis.pearsonR)}</td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-accent-soft">{formatR(analysis.spearmanR)}</td>
                                    <td className={`px-4 py-3 whitespace-nowrap text-sm ${enoughSamples ? 'text-accent-soft' : 'text-yellow-600'}`}>
                                        {`${Math.round(analysis.effectiveSampleSize)} / ${analysis.requiredSampleSize}`}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-accent-soft">{analysis.lag}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
}
