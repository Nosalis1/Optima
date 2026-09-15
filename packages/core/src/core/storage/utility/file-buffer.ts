import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import * as zlib from "zlib";
import * as crypto from "crypto";
import * as readline from "readline";
import { randomUUID } from "crypto";
import Logger from "../../telemetry/logger";

export interface StoredRecord<T = unknown> {
    id: string;
    createdAt: string;
    schemaVersion: number;
    category: string;
    payload: T;
}

export interface WriteOptions {
    schemaVersion?: number;
    id?: string;
}

export interface PathAttrs {
    baseDir: string;
    category: string;
    date?: Date;
}

export function constructFilePath(attrs: PathAttrs): string {
    const { baseDir, category } = attrs;
    const date = attrs.date ?? new Date();

    const safeCategory = sanitizeSegment(category);
    const dateStr = date.toISOString().slice(0, 10);

    const dir = path.join(baseDir, safeCategory);
    fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, `${dateStr}.ndjson`);
}

function sanitizeSegment(segment: string): string {
    const cleaned = segment.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
    if (!cleaned) throw new Error(`Invalid path segment: "${segment}"`);
    return cleaned;
}

export function dataToBuffer(data: unknown): Buffer {
    if (Buffer.isBuffer(data)) {
        return data;
    } else if (typeof data === 'string') {
        return Buffer.from(data, 'utf8');
    } else if (data !== null && typeof data === 'object') {
        return Buffer.from(JSON.stringify(data), 'utf8');
    } else {
        throw new Error(`Invalid data type: ${typeof data}`);
    }
}

export function writeToFileBuffer(filePath: string, data: Buffer): void {
    fs.writeFileSync(filePath, data);
}

export function wrapRecord<T>(
    category: string,
    payload: T,
    options: WriteOptions = {}
): StoredRecord<T> {
    return {
        id: options.id ?? randomUUID(),
        createdAt: new Date().toISOString(),
        schemaVersion: options.schemaVersion ?? 1,
        category,
        payload,
    };
}

export function appendRecords<T>(
    filePath: string,
    category: string,
    payloads: T[],
    options: WriteOptions = {}
): StoredRecord<T>[] {
    const records = payloads.map(p => wrapRecord(category, p, options));

    const lines = records.map(r => {
        try {
            return JSON.stringify(r);
        } catch (err) {
            throw new Error(`Failed to serialize record: ${err}`);
        }
    });

    const chunk = lines.join('\n') + '\n';
    fs.appendFileSync(filePath, chunk, 'utf8');

    return records;
}

export async function appendRecordsAsync<T>(
    filePath: string,
    category: string,
    payloads: T[],
    options: WriteOptions = {}
): Promise<StoredRecord<T>[]> {
    const records = payloads.map(p => wrapRecord(category, p, options));
    const chunk = records.map(r => JSON.stringify(r)).join('\n') + '\n';
    await fsp.appendFile(filePath, chunk, 'utf8');
    return records;
}

export async function* readRecords<T = unknown>(filePath: string): AsyncGenerator<StoredRecord<T>> {
    const isGz = filePath.endsWith('.gz');
    const rawStream = fs.createReadStream(filePath);
    const stream = isGz ? rawStream.pipe(zlib.createGunzip()) : rawStream;
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let lineNumber = 0;
    for await (const line of rl) {
        lineNumber++;
        if (!line.trim()) continue;
        try {
            yield JSON.parse(line) as StoredRecord<T>;
        } catch (err) {
            Logger.error('Failed to parse line', lineNumber, 'in file', filePath, ':', err);
        }
    }
}

export async function readAllRecords<T = unknown>(filePath: string): Promise<StoredRecord<T>[]> {
    const out: StoredRecord<T>[] = [];
    for await (const record of readRecords<T>(filePath)) {
        out.push(record);
    }
    return out;
}

export async function writeNDJSONAtomic<T>(filePath: string, records: StoredRecord<T>[]): Promise<void> {
    const dir = path.dirname(filePath);
    const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);
    const content = records.map((r) => JSON.stringify(r)).join('\n') + (records.length ? '\n' : '');
    const handle = await fsp.open(tmpPath, 'w');
    try {
        await handle.writeFile(content, 'utf8');
        await handle.sync();
    } finally {
        await handle.close();
    }
    await fsp.rename(tmpPath, filePath);
}

export async function writeJSONAtomic<T>(filePath: string, data: unknown): Promise<void> {
    const dir = path.dirname(filePath);
    const tmpPath = path.join(dir, `.${path.basename(filePath)}.${process.pid}.tmp`);

    await fsp.mkdir(dir, { recursive: true });
    const handle = await fsp.open(tmpPath, "w");
    try {
        await handle.writeFile(JSON.stringify(data, null, 2), "utf8");
        await handle.sync();
    } finally {
        await handle.close();
    }
    await fsp.rename(tmpPath, filePath);
}

export async function readJSON<T>(filePath: string): Promise<T> {
    const content = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(content) as T;
}

export async function writeChecksum(filePath: string): Promise<string> {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    for await (const chunk of stream) hash.update(chunk);
    const digest = hash.digest('hex');
    await fsp.writeFile(`${filePath}.sha256`, `${digest}  ${path.basename(filePath)}\n`, 'utf8');
    return digest;
}

export async function verifyChecksum(filePath: string): Promise<boolean> {
    const sidecarPath = `${filePath}.sha256`;
    const expected = (await fsp.readFile(sidecarPath, 'utf8')).split(/\s+/)[0];

    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    for await (const chunk of stream) hash.update(chunk);
    const actual = hash.digest('hex');

    return actual === expected;
}

export async function archiveFile(filePath: string, deleteOriginal: boolean = false): Promise<string> {
    const gzPath = `${filePath}.gz`;
    await new Promise<void>((resolve, reject) => {
        const source = fs.createReadStream(filePath);
        const dest = fs.createWriteStream(gzPath);
        const gzip = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
        source.pipe(gzip).pipe(dest);
        dest.on('finish', () => resolve());
        dest.on('error', (err) => reject(err));
        source.on('error', (err) => reject(err));
    });

    await writeChecksum(gzPath);

    if (deleteOriginal) {
        await fsp.unlink(filePath);
        await fsp.rm(`${filePath}.sha256`, { force: true });
    }

    return gzPath;
}