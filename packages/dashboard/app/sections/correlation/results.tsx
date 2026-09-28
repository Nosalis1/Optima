import { Card } from '@/app/components/cards/card';
import type { CorrelationData } from '../../domain';

type Props = {
    results: CorrelationData['results'];
    onSelect?: (id: string) => void;
}

export function Results({ results, onSelect }: Props) {
    const headers = ['Pair', 'Status', 'Direction', 'Pearson', 'Spearman', 'Effective N', 'Lag'];

    return (
        <Card header={{ title: 'Results', description: 'Click on a row to view details' }}>
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
                        {results.map((row, index) => (
                            <tr key={index} className="cursor-pointer hover:bg-accent/10" onClick={() => onSelect?.(row.id)}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{`${row.xLabel} - ${row.yLabel}`}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.analysis.status}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.analysis.direction}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.analysis.pearsonR.toFixed(3)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.analysis.spearmanR.toFixed(3)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{Math.round(row.analysis.effectiveSampleSize)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-accent-soft">{row.analysis.lag}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </Card>
    );
}