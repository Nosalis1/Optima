
/**
 * Represents the types of events that can occur in the application.
 */
export type ApplicationEventType =
    | 'STARTUP'
    | 'SHUTDOWN'
    | 'CRASH'
    | 'ANOMALY';

/**
 * Represents an event that occurs in the application.
 */
export interface ApplicationEvent {
    timestamp: string;
    type: ApplicationEventType;
    applicationVersion: string;
    reason: string;
}
