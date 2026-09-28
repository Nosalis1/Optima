import { Card } from '@/app/components/cards/card';
import type { CorrelationPairResult } from '../../domain';

export function Detailed({ result }: { result: CorrelationPairResult | null }) {

    if (result === null) return null;

    function renderPart(label: string, value: any) {
        return (
            <div className="space-y-1">
                <p className="font-semibold">{label}:</p>
                <p>{value}</p>
            </div>
        );
    }

    return (
        <Card header={{ title: 'Detailed Result' }} padding>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderPart('Pair', `${result.xLabel} - ${result.yLabel}`)}
                {renderPart('Status', result.analysis.status)}
                {renderPart('Direction', result.analysis.direction)}
                {renderPart('Pearson R', result.analysis.pearsonR)}
                {renderPart('Spearman R', result.analysis.spearmanR)}
                {renderPart('Raw Pearson R', result.analysis.rawPearsonR)}
                {renderPart('Difference Pearson R', result.analysis.differencePearsonR)}
                {renderPart('Determination', result.analysis.determination)}
                {renderPart('Lag', result.analysis.lag)}
                {renderPart('Lagged Pearson R', result.analysis.laggedPearsonR)}
                {renderPart('Sample Size', result.analysis.sampleSize)}
                {renderPart('Effective Sample Size', result.analysis.effectiveSampleSize)}
                {renderPart('Required Sample Size', result.analysis.requiredSampleSize)}
                {renderPart('Autocorrelation X', result.analysis.autocorrelationX)}
                {renderPart('Autocorrelation Y', result.analysis.autocorrelationY)}
                {renderPart('Trend Driven', result.analysis.trendDriven ? 'Yes' : 'No')}
                {renderPart('Recommendation', result.analysis.recommendation)}
            </div>
        </Card>
    );
}
