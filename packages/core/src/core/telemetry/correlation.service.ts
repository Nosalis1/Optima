import type { LocalRepository } from '../storage/local.repository';
import {
    pearsonCorrelation,
    spearmanCorrelation,
    determinationAndAlienation,
    calculateSampleSizeProportion
} from '../utility/statistics';

type PerformanceReport = {
    status:
    | 'STABLE'
    | 'NON_LINEAR_BURST'
    | 'EXTERNAL_INFLUENCE'
    | 'SYSTEMIC_LINEAR_DEGRADATION';
    recommendation: string;
};

export class CorrelationService {
    private readonly sampleSize: number;

    constructor(
        private readonly storage: LocalRepository
    ) {
        this.sampleSize =
            calculateSampleSizeProportion(0.05, 0.95) //! This maybe from config?
    }

    tick(): void {
        const totalHistory = this.storage.bucket.getHistory();
        const size = totalHistory.length;

        if (size < this.sampleSize) { //! This is not triggering on high sampleSizes, cap is config bucket size
            return;
        }

        const rps = totalHistory.map(e => e.rps.count);
        const errorRate = totalHistory.map(e => e.error.rate);
        const heapUsage = totalHistory.map(e => e.health.memory.heapUsage);
        const p95Latency = totalHistory.map(e => e.latency.p95);
        const eventLoopLag = totalHistory.map(e => e.health.eventLoop.lag);
        const averageLatency = totalHistory.map(e => e.latency.average);

        // 1. eventLoopLag <-> p95 latency
        this.handleReport(this.testCorrelation(eventLoopLag, p95Latency));
        // 2. eventLoopLag <-> average latency
        this.handleReport(this.testCorrelation(eventLoopLag, averageLatency));
        // 3. heapUsage <-> eventLoopLag
        this.handleReport(this.testCorrelation(heapUsage, eventLoopLag));
        // 4. heapUsage <-> p95 latency
        this.handleReport(this.testCorrelation(heapUsage, p95Latency));
        // 5. rps <-> errorRate
        this.handleReport(this.testCorrelation(rps, errorRate));
        // 6. rps <-> latency
        this.handleReport(this.testCorrelation(rps, averageLatency));
    }

    private testCorrelation(x: number[], y: number[]): PerformanceReport {
        const pearsonR = pearsonCorrelation(x, y);
        const spearmanR = spearmanCorrelation(x, y);
        const { determination, alienation } = determinationAndAlienation(pearsonR);

        if (Math.abs(spearmanR) > 0.7 && Math.abs(pearsonR) <= 0.6) {
            return {
                status: 'NON_LINEAR_BURST',
                recommendation: 'Kritično! Detektovan nelinearan (eksponencijalni) skok. Sistem ulazi u zonu zasićenja resursa.'
            };
        } else if (spearmanR > 0.7 && determination > 0.5) {
            if (alienation > 0.4) {
                return {
                    status: 'EXTERNAL_INFLUENCE',
                    recommendation: `Uočena je povezanost (r=${spearmanR.toFixed(2)}), ali eksterni faktori utiču sa ${(alienation * 100).toFixed(1)}%. Ne donositi ishitren zaključak o uzročnosti.`
                };
            } else {
                return {
                    status: 'SYSTEMIC_LINEAR_DEGRADATION',
                    recommendation: `Linearna degradacija. Varijable zajednički rastu.`
                }
            }
        }

        return {
            status: 'STABLE',
            recommendation: 'Sistem je stabilan. Nema detektovanih uzročnih veza između posmatranih varijabli.'
        };
    }

    private handleReport(report: PerformanceReport): void {
        if (report.status === 'STABLE') return;
        this.storage.alerts.warning(report.recommendation);
    }
}
