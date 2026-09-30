import { randomUUID } from 'crypto';
import type {
    SessionRecord,
    SessionManifest
} from '../../domain';
import {
    readJSON, tryOrDefault, writeJSONAtomic
} from '../utility/index';
import type { PersistenceWriter } from './persistence-writer';

export interface SessionWindow {
    start: Date;
    end: Date;
}

const emptyManifest = (): SessionManifest => ({ version: 2, sessions: [] });

export class SessionRegistry {
    private manifest: SessionManifest = emptyManifest();
    private dirty = false;
    private _current: SessionRecord | null = null;
    private _recoveredFromCrash = false;

    constructor(
        private readonly manifestPath: string,
        private readonly writer: PersistenceWriter
    ) { }

    get current(): SessionRecord | null { return this._current; }
    get all(): readonly SessionRecord[] { return this.manifest.sessions; }
    get recoveredFromCrash(): boolean { return this._recoveredFromCrash; }

    async start(sessionId: string = randomUUID()): Promise<SessionRecord> {
        const raw = await tryOrDefault<any>(() => readJSON<any>(this.manifestPath), null);
        this.manifest = this.migrate(raw);

        for (const s of this.manifest.sessions) {
            if (s.status === 'RUNNING') {
                s.status = 'INTERRUPTED';
                s.endedAt = s.lastPersistedAt ?? s.startedAt;
                this._recoveredFromCrash = true;
            }
        }

        const number = this.manifest.sessions.reduce((m, s) => Math.max(m, s.sessionNumber), 0) + 1;

        this._current = {
            sessionId: sessionId,
            sessionNumber: number,
            startedAt: new Date().toISOString(),
            endedAt: null,
            lastPersistedAt: null,
            lastCommitedSequence: 0,
            status: 'RUNNING',
        };
        this.manifest.sessions.push(this._current);
        await this.save('manifest: session start');
        return this._current;
    }

    notePersisted(committedSequence?: number): void {
        if (!this._current) return;
        this._current.lastPersistedAt = new Date().toISOString();
        if (committedSequence !== undefined) {
            this._current.lastCommitedSequence = Math.max(this._current.lastCommitedSequence, committedSequence);
        }
        this.dirty = true;
    }

    async heartbeat(): Promise<void> {
        if (!this.dirty) return;
        this.dirty = false;
        await this.save('manifest: heartbeat').catch(() => { this.dirty = true; });
    }

    async complete(): Promise<void> {
        if (!this._current) return;
        await this.writer.whenIdle();
        const now = new Date().toISOString();
        this._current.status = 'COMPLETED';
        this._current.endedAt = now;
        this._current.lastPersistedAt = now;
        this._current.lastCommitedSequence = this.writer.commitedSequence;
        await this.save('manifest: session complete');
    }

    static windowEnd(s: SessionRecord): string | null {
        return s.status === 'RUNNING' ? null : (s.endedAt ?? s.lastPersistedAt);
    }

    static window(s: SessionRecord): SessionWindow {
        const end = SessionRegistry.windowEnd(s);
        return {
            start: new Date(s.startedAt),
            end: end ? new Date(end) : new Date(),
        };
    }

    static enumerateDates({ start, end }: SessionWindow): string[] {
        const dates: string[] = [];
        const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
        const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));

        while (cursor <= last) {
            dates.push(cursor.toISOString().slice(0, 10));
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
        return dates;
    }

    static enumerateHours({ start, end }: SessionWindow): string[] {
        const hours: string[] = [];
        const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate(), start.getUTCHours()));
        const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate(), end.getUTCHours()));

        while (cursor <= last) {
            hours.push(cursor.toISOString());
            cursor.setUTCHours(cursor.getUTCHours() + 1);
        }
        return hours;
    }

    private save(description: string): Promise<number> {
        const snapshot = structuredClone(this.manifest);
        return this.writer.enqueueTask(description, () => writeJSONAtomic(this.manifestPath, snapshot));
    }

    private migrate(raw: any): SessionManifest {
        if (raw?.version === 2 && Array.isArray(raw.sessions)) return raw as SessionManifest;
        const sessions: SessionRecord[] = (raw?.sessionHistory ?? []).map((h: any) => ({
            sessionId: `legacy-${h.sessionNumber}`,
            sessionNumber: h.sessionNumber,
            startedAt: h.startedAt,
            endedAt: h.endedAt ?? null,
            lastPersistedAt: h.endedAt ?? null,
            lastCommittedSequence: 0,
            status: h.endedAt ? 'COMPLETED' : 'INTERRUPTED',
        }));
        return { version: 2, sessions };
    }
}
