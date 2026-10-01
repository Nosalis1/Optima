import {
    deriveMetrics,
    deriveRuntime,
    emptyRuntime,
    mergeRuntimeInto
} from '../storage/stores/bucket-metric';
import type { MetricsQueryResult, TelemetryQueryService } from './telemetry-query.service';
import type {
    ApplicationEventType,
    Incident,
    IncidentRuleStatus,
    IncidentSeverity,
    IncidentState,
    IncidentsSnapshot,
    RelatedFinding
} from '../domain';

export interface Observation {
    valid: boolean;
    value: number | null;
    reason?: string;
    endMs: number;
}

export interface IncidentTiming {
    pendingForMs: number;
    recoveryForMs: number;
    resolvedHoldMs: number;
}

export interface RuleTracker {
    state: IncidentState;
    sinceMs: number | null;
    breachStartMs: number | null;
    recoveryStartMs: number | null;
}

export interface IncidentRule {
    id: string;
    title: string;
    metric: string;
    unit: string;
    severity: IncidentSeverity;
    threshold: number;
    recoverBelow: number;
    measure(window: MetricsQueryResult): Omit<Observation, 'endMs'>;
}

export const initialTracker = (): RuleTracker => ({ state: 'NORMAL', sinceMs: null, breachStartMs: null, recoveryStartMs: null });

export function stepRule(t: RuleTracker, obs: Observation, rule: Pick<IncidentRule, 'threshold' | 'recoverBelow'>, timing: IncidentTiming): RuleTracker {
    const now = obs.endMs;
    const valid = obs.valid && obs.value !== null;
    const breach = valid && obs.value! > rule.threshold;

    switch (t.state) {
        case 'NORMAL':
            return breach ? { state: 'PENDING', sinceMs: now, breachStartMs: now, recoveryStartMs: null } : t;

        case 'PENDING':
            if (!breach) return { state: 'NORMAL', sinceMs: now, breachStartMs: null, recoveryStartMs: null };
            if (now - t.breachStartMs! >= timing.pendingForMs) {
                return { state: 'FIRING', sinceMs: now, breachStartMs: t.breachStartMs, recoveryStartMs: null };
            }
            return t;

        case 'FIRING': {
            if (!valid || obs.value! > rule.recoverBelow) return { ...t, recoveryStartMs: null };
            const recoveryStartMs = t.recoveryStartMs ?? now;
            if (now - recoveryStartMs >= timing.recoveryForMs) {
                return { state: 'RESOLVED', sinceMs: now, breachStartMs: null, recoveryStartMs: null };
            }
            return { ...t, recoveryStartMs };
        }

        case 'RESOLVED':
            if (breach) return { state: 'PENDING', sinceMs: now, breachStartMs: now, recoveryStartMs: null };
            if (now - (t.sinceMs ?? now) >= timing.resolvedHoldMs) {
                return { state: 'NORMAL', sinceMs: now, breachStartMs: null, recoveryStartMs: null };
            }
            return t;
    }
}

export interface IncidentRuleOptions {
    windowIntervals?: number;
    minRequests?: number;
    serverErrorRate?: number;
    p95LatencyMs?: number;
    eventLoopLagMs?: number;
    recoveryRatio?: number;
}

function completeWindow(w: MetricsQueryResult, windowIntervals: number): string | undefined {
    if (w.total.bucketCount < windowIntervals) return 'INCOMPLETE_WINDOW';
    if (w.issues.some(i => i.type === 'GAP')) return 'GAPS';
    return undefined;
}

export function defaultIncidentRules(o: Required<IncidentRuleOptions>): IncidentRule[] {
    const requestWindow = (w: MetricsQueryResult): string | undefined => {
        const incomplete = completeWindow(w, o.windowIntervals);
        if (incomplete) return incomplete;
        if (w.total.requests.requestCount < o.minRequests) return 'TOO_FEW_REQUESTS';
        return undefined;
    };

    return [
        {
            id: 'server-error-rate',
            title: 'High server error rate (5xx)',
            metric: 'errorRate',
            unit: '%',
            severity: 'critical',
            threshold: o.serverErrorRate * 100,
            recoverBelow: o.serverErrorRate * 100 * o.recoveryRatio,
            measure: w => {
                const reason = requestWindow(w);
                if (reason) return { valid: false, value: null, reason };
                const r = w.total.requests;
                return { valid: true, value: (r.serverErrorCount / r.requestCount) * 100 };
            },
        },
        {
            id: 'p95-latency',
            title: 'High p95 latency',
            metric: 'p95Latency',
            unit: 'ms',
            severity: 'warning',
            threshold: o.p95LatencyMs,
            recoverBelow: o.p95LatencyMs * o.recoveryRatio,
            measure: w => {
                const reason = requestWindow(w);
                if (reason) return { valid: false, value: null, reason };
                return { valid: true, value: deriveMetrics(w.total.requests, w.total.durationMs).p95 };
            },
        },
        {
            id: 'event-loop-lag',
            title: 'High event loop lag',
            metric: 'eventLoopLag',
            unit: 'ms',
            severity: 'warning',
            threshold: o.eventLoopLagMs,
            recoverBelow: o.eventLoopLagMs * o.recoveryRatio,
            measure: w => {
                const incomplete = completeWindow(w, o.windowIntervals);
                if (incomplete) return { valid: false, value: null, reason: incomplete };
                const runtime = emptyRuntime();
                for (const p of w.points) mergeRuntimeInto(runtime, p.runtime, true);
                const mean = deriveRuntime(runtime, w.total.durationMs).eventLoopDelayMeanMs;
                return mean === null
                    ? { valid: false, value: null, reason: 'NO_EVENT_LOOP_SAMPLES' }
                    : { valid: true, value: mean };
            },
        },
    ];
}

export const CAUSE_NOTE = 'Related findings show which metrics changed together during the incident. Correlation does not establish the cause.';

export interface IncidentServiceDeps {
    queries: TelemetryQueryService;
    sessionId: () => string;
    durable: () => boolean;
    related?: (metric: string) => RelatedFinding[];
    emit?: (event: { type: ApplicationEventType; reason: string; details: Record<string, unknown> }) => unknown;
}

export interface IncidentServiceOptions extends Required<IncidentRuleOptions>, IncidentTiming {
    historySize: number;
    rules?: IncidentRule[];
}

interface RuleEntry {
    rule: IncidentRule;
    tracker: RuleTracker;
    last: Observation | null;
    incident: Incident | null;
}

export class IncidentService {
    private readonly timing: IncidentTiming;
    private readonly windowIntervals: number;
    private readonly historySize: number;
    private readonly entries: RuleEntry[];
    private history: Incident[] = [];
    private lastSequence: number | null = null;
    private lastSessionId: string | null = null;

    constructor(
        private readonly deps: IncidentServiceDeps,
        options: IncidentServiceOptions
    ) {
        this.timing = {
            pendingForMs: options.pendingForMs,
            recoveryForMs: options.recoveryForMs,
            resolvedHoldMs: options.resolvedHoldMs,
        };
        this.windowIntervals = options.windowIntervals;
        this.historySize = options.historySize;
        const rules = options.rules ?? defaultIncidentRules(options);
        this.entries = rules.map(rule => ({ rule, tracker: initialTracker(), last: null, incident: null }));
    }

    tick(): void {
        this.evaluate();
    }

    evaluate(): boolean {
        const sessionId = this.deps.sessionId();
        if (sessionId !== this.lastSessionId) {
            this.lastSessionId = sessionId;
            this.lastSequence = null;
            for (const e of this.entries) { e.tracker = initialTracker(); e.last = null; e.incident = null; }
        }

        const window = this.deps.queries.recent(this.windowIntervals, {
            consistency: this.deps.durable() ? 'committed' : 'live',
        });
        const last = window.points[window.points.length - 1];
        if (!last || last.sequenceTo === this.lastSequence) return false;
        this.lastSequence = last.sequenceTo;

        const endMs = Date.parse(last.endTime);
        for (const entry of this.entries) {
            const obs: Observation = { ...entry.rule.measure(window), endMs };
            const prev = entry.tracker;
            entry.tracker = stepRule(prev, obs, entry.rule, this.timing);
            entry.last = obs;
            this.apply(entry, prev.state, window, sessionId);
        }
        return true;
    }

    snapshot(): IncidentsSnapshot {
        const iso = (ms: number | null) => ms === null ? null : new Date(ms).toISOString();
        const rules: IncidentRuleStatus[] = this.entries.map(({ rule, tracker, last, incident }) => ({
            ruleId: rule.id,
            title: rule.title,
            metric: rule.metric,
            unit: rule.unit,
            severity: rule.severity,
            state: tracker.state,
            since: iso(tracker.sinceMs),
            value: last?.value ?? null,
            threshold: rule.threshold,
            recoverBelow: rule.recoverBelow,
            valid: last?.valid ?? false,
            reason: last?.reason,
            incidentId: incident?.incidentId ?? null,
        }));
        const incidents = [...this.history].sort((a, b) =>
            (a.status === b.status ? 0 : a.status === 'FIRING' ? -1 : 1) || b.firedAt.localeCompare(a.firedAt));
        return { rules, incidents, serverTime: new Date().toISOString() };
    }

    private apply(entry: RuleEntry, prevState: IncidentState, window: MetricsQueryResult, sessionId: string): void {
        const { rule, tracker, last } = entry;
        const value = last?.valid ? last.value : null;

        if (prevState !== 'FIRING' && tracker.state === 'FIRING') {
            const first = window.points[0];
            const lastPoint = window.points[window.points.length - 1];
            const incident: Incident = {
                incidentId: `${sessionId}:${rule.id}:${lastPoint.sequenceTo}`,
                sessionId,
                ruleId: rule.id,
                title: rule.title,
                metric: rule.metric,
                unit: rule.unit,
                severity: rule.severity,
                status: 'FIRING',
                threshold: rule.threshold,
                recoverBelow: rule.recoverBelow,
                breachStartedAt: new Date(tracker.breachStartMs!).toISOString(),
                firedAt: new Date(tracker.sinceMs!).toISOString(),
                resolvedAt: null,
                peakValue: value ?? rule.threshold,
                lastValue: value,
                sequenceFrom: first.sequenceFrom,
                sequenceTo: lastPoint.sequenceTo,
                relatedFindings: this.deps.related?.(rule.metric) ?? [],
                causeNote: CAUSE_NOTE,
            };
            entry.incident = incident;
            this.history.push(incident);
            if (this.history.length > this.historySize) this.history.splice(0, this.history.length - this.historySize);
            void this.deps.emit?.({ type: 'INCIDENT_OPENED', reason: `${rule.title}`, details: { ...incident } });
            return;
        }

        const incident = entry.incident;
        if (!incident) return;

        if (tracker.state === 'FIRING') {
            if (value !== null) {
                incident.lastValue = value;
                incident.peakValue = Math.max(incident.peakValue, value);
            }
            return;
        }

        if (prevState === 'FIRING' && tracker.state === 'RESOLVED') {
            incident.status = 'RESOLVED';
            incident.resolvedAt = new Date(tracker.sinceMs!).toISOString();
            if (value !== null) incident.lastValue = value;
            entry.incident = null;
            void this.deps.emit?.({ type: 'INCIDENT_RESOLVED', reason: `${rule.title}`, details: { ...incident } });
        }
    }
}
