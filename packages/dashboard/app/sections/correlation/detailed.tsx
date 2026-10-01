import { Card } from '@/app/components/cards/card';
import type { CorrelationPairResult } from '../../domain';
import { DIRECTION_SYMBOL, STATUS_COLOR, STATUS_LABEL, formatR } from './labels';

function Group({ title, values }: { title: string; values: Array<[string, string]> }) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-[10px] text-accent-soft uppercase tracking-wider font-semibold">{title}</p>
            {values.map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm">
                    <span className="text-accent-soft">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                </div>
            ))}
        </div>
    );
}

export function Detailed({ result }: { result: CorrelationPairResult | null }) {
    if (result === null) {
        return (
            <Card header={{ title: 'Details' }} padding>
                <p className="text-sm text-accent-soft">No pair selected.</p>
            </Card>
        );
    }

    const { analysis } = result;

    return (
        <Card header={{ title: 'Details', description: `${result.xLabel} → ${result.yLabel}` }} padding>
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold" style={{ color: STATUS_COLOR[analysis.status] }}>
                        {STATUS_LABEL[analysis.status]}
                    </span>
                    <span className="text-sm text-accent-soft">
                        {`${DIRECTION_SYMBOL[analysis.direction]} ${analysis.direction.toLowerCase()} (expected ${result.expectedDirection.toLowerCase()})`}
                    </span>
                </div>

                <Group title="Strength" values={[
                    ['Pearson r', formatR(analysis.pearsonR)],
                    ['Spearman ρ', formatR(analysis.spearmanR)],
                    ['Determination R²', formatR(analysis.determination)],
                ]} />

                <Group title="Time effects" values={[
                    ['Raw Pearson r', formatR(analysis.rawPearsonR)],
                    ['Differenced Pearson r', formatR(analysis.differencePearsonR)],
                    ['Best lag', `${analysis.lag}`],
                    ['Lagged Pearson r', formatR(analysis.laggedPearsonR)],
                    ['Trend driven', analysis.trendDriven ? 'Yes' : 'No'],
                ]} />

                <Group title="Sample" values={[
                    ['Sample size', `${analysis.sampleSize}`],
                    ['Effective / required', `${Math.round(analysis.effectiveSampleSize)} / ${analysis.requiredSampleSize}`],
                    ['Autocorrelation X', formatR(analysis.autocorrelationX)],
                    ['Autocorrelation Y', formatR(analysis.autocorrelationY)],
                ]} />

                <p className="text-sm text-foreground border-t border-border pt-3">{analysis.recommendation}</p>
            </div>
        </Card>
    );
}
