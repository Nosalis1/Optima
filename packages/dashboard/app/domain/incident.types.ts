export type IncidentState = 'NORMAL' | 'PENDING' | 'FIRING' | 'RESOLVED';

export type IncidentSeverity = 'warning' | 'critical';

export interface RelatedFinding {
    findingId: string;
    pairId: string;
    status: string;
    direction: string;
    pearsonR: number;
}

export interface Incident {
    incidentId: string;
    sessionId: string;
    ruleId: string;
    title: string;
    metric: string;
    unit: string;
    severity: IncidentSeverity;
    status: 'FIRING' | 'RESOLVED';
    threshold: number;
    recoverBelow: number;
    breachStartedAt: string;
    firedAt: string;
    resolvedAt: string | null;
    peakValue: number;
    lastValue: number | null;
    sequenceFrom: number;
    sequenceTo: number;
    relatedFindings: RelatedFinding[];
    causeNote: string;
}

export interface IncidentRuleStatus {
    ruleId: string;
    title: string;
    metric: string;
    unit: string;
    severity: IncidentSeverity;
    state: IncidentState;
    since: string | null;
    value: number | null;
    threshold: number;
    recoverBelow: number;
    valid: boolean;
    reason?: string;
    incidentId: string | null;
}

export interface IncidentsSnapshot {
    rules: IncidentRuleStatus[];
    incidents: Incident[];
    serverTime: string;
}
