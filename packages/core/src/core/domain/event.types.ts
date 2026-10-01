
/**
 * Represents the types of events that can occur in the application.
 */
export type ApplicationEventType =
    | 'STARTUP'
    | 'SHUTDOWN'
    | 'CRASH'
    | 'INCIDENT_OPENED'
    | 'INCIDENT_RESOLVED';

/**
 * Represents an event that occurs in the application.
 */
export interface ApplicationEvent {
    timestamp: string;
    type: ApplicationEventType;
    applicationVersion: string;
    reason: string;
    details?: Record<string, unknown>;
}
