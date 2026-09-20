import fs from "fs/promises";
import path from "path";
import { writeChecksum, archiveFile } from "./file-buffer";

export type PersistenceCategory = 'http_requests' | 'system_health' | 'events';

export async function resolveExistingFile(
    baseDir: string,
    category: PersistenceCategory,
    date: string,
): Promise<string | null> {
    const dir = path.join(baseDir, category);
    const plain = path.join(dir, `${date}.ndjson`);
    const gz = `${plain}.gz`;

    if (await fs.access(plain).then(() => true).catch(() => false)) return plain;
    if (await fs.access(gz).then(() => true).catch(() => false)) return gz;
    return null;
}

export async function archiveOldPersistenceFiles(
    baseDir: string,
    category: PersistenceCategory
): Promise<void> {
    const dir = path.join(baseDir, category);

    const today = new Date().toISOString().slice(0, 10);
    const files = await fs.readdir(dir).catch(() => [] as string[]);

    for (const file of files) {
        if (!file.endsWith('.ndjson')) continue;
        if (file.startsWith(today)) continue;

        const fullPath = path.join(dir, file);
        await writeChecksum(fullPath);
        await archiveFile(fullPath);
    }
}