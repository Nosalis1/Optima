import type { BucketsRequest } from '../domain';

const MAX_ID_LENGTH = 128;

export function parseBucketsRequest(raw: unknown): BucketsRequest | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;

    if (typeof r.subscriptionId !== 'string' || r.subscriptionId.length === 0 || r.subscriptionId.length > MAX_ID_LENGTH) return null;

    const sessionId = typeof r.sessionId === 'string' && r.sessionId.length <= MAX_ID_LENGTH ? r.sessionId : null;
    const afterSequence = typeof r.afterSequence === 'number' && Number.isInteger(r.afterSequence) && r.afterSequence >= 0
        ? r.afterSequence : null;
    const afterEndTime = typeof r.afterEndTime === 'string' && !Number.isNaN(Date.parse(r.afterEndTime))
        ? r.afterEndTime : null;
    const limit = typeof r.limit === 'number' && Number.isFinite(r.limit) ? r.limit : undefined;

    return { subscriptionId: r.subscriptionId, sessionId, afterSequence, afterEndTime, limit };
}
