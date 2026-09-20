
export interface SessionWindow {
    start: Date;
    end: Date;
}

export function getSessionWindow(startedAt: string, endedAt: string | null): SessionWindow {
    return {
        start: new Date(startedAt),
        end: endedAt ? new Date(endedAt) : new Date(),
    };
}

function enumerateDates(start: Date, end: Date): string[] {
    const dates: string[] = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

    while (cursor <= last) {
        dates.push(cursor.toISOString().slice(0, 10));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    return dates;
}

export function getSessionDatesFromWindow(window: SessionWindow): string[] {
    return enumerateDates(window.start, window.end);
}

function enumerateHours(start: Date, end: Date): string[] {
    const hours: string[] = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours()));
    const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours()));

    while (cursor <= last) {
        hours.push(cursor.toISOString());
        cursor.setUTCHours(cursor.getUTCHours() + 1);
    }
    return hours;
}

export function getSessionHoursFromWindow(window: SessionWindow): string[] {
    return enumerateHours(window.start, window.end);
}

export function hourKeyFor(date: Date | string): string {
    if (typeof date === 'string') date = new Date(date);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())).toISOString();
}