import type { TelemetryQueryService } from '../telemetry-query.service';
import {
    INPUT_SCHEMA_VERSION,
    stableStringify,
    type CorrelationFinding,
} from './correlation-finding';
import { PAIRS, prepareSeries, runAnalysis, type MetricKey } from './correlation-input';

export type ReplayOutcome =
    | { status: 'REPRODUCED'; replayed: CorrelationFinding }
    | { status: 'INPUT_MISSING'; expectedBuckets: number; foundBuckets: number }
    | { status: 'INPUT_CHANGED'; storedDigest: string; replayedDigest: string }
    | { status: 'RESULT_DIFFERS'; replayed: CorrelationFinding }
    | { status: 'UNSUPPORTED'; reason: string }
    | { status: 'NOT_FOUND'; findingId: string };

const inRanges = (seqFrom: number, seqTo: number, ranges: Array<[number, number]>) =>
    ranges.some(([a, b]) => seqFrom >= a && seqTo <= b);

export async function verifyFinding(queries: TelemetryQueryService, finding: CorrelationFinding): Promise<ReplayOutcome> {
    if (finding.inputSchemaVersion !== INPUT_SCHEMA_VERSION) {
        return { status: 'UNSUPPORTED', reason: `input schema ${finding.inputSchemaVersion}` };
    }
    const pair = PAIRS.find(p => p.x === finding.metricX && p.y === finding.metricY);
    if (!pair) return { status: 'UNSUPPORTED', reason: `unknown pair ${finding.metricX}->${finding.metricY}` };

    const result = await queries.query({
        sessionId: finding.sessionId,
        from: finding.windowStart,
        to: finding.windowEnd,
        method: finding.scope.method,
        route: finding.scope.route,
        resolutionMs: finding.resolutionMs ?? undefined,
        consistency: 'committed',
    });

    const points = result.points.filter(p => inRanges(p.sequenceFrom, p.sequenceTo, finding.input.ranges));
    const found = points.reduce((s, p) => s + p.bucketCount, 0);
    if (found < finding.input.bucketCount) {
        return { status: 'INPUT_MISSING', expectedBuckets: finding.input.bucketCount, foundBuckets: found };
    }

    const prepared = prepareSeries(points, pair as { x: MetricKey; y: MetricKey }, finding.transform, finding.parameters.minCoverage);
    if (prepared.digest !== finding.input.digest) {
        return { status: 'INPUT_CHANGED', storedDigest: finding.input.digest, replayedDigest: prepared.digest };
    }

    const replayedResult = runAnalysis(prepared, pair, finding.parameters);
    const replayed: CorrelationFinding = {
        ...finding,
        createdAt: new Date().toISOString(),
        source: 'replay',
        validPairCount: prepared.validPairCount,
        droppedPairCount: prepared.droppedPairCount,
        coverage: prepared.coverage,
        qualityFlags: prepared.qualityFlags,
        result: replayedResult,
    };

    return stableStringify(replayedResult) === stableStringify(finding.result)
        ? { status: 'REPRODUCED', replayed }
        : { status: 'RESULT_DIFFERS', replayed };
}