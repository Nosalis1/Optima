import { readRecords } from "./file-buffer";
import { resolveExistingFile, type PersistenceCategory } from "./persistence-files";
import type { SessionWindow } from "./session-window";

async function streamWriteCategoryRecords(
    out: NodeJS.WritableStream,
    baseDir: string,
    category: PersistenceCategory,
    dates: string[],
    window: SessionWindow
): Promise<void> {
    let isFirst = true;
    const { start: windowStart, end: windowEnd } = window;

    for (const date of dates) {
        const filePath = await resolveExistingFile(baseDir, category, date);
        if (!filePath) continue;

        for await (const record of readRecords(filePath)) {
            const ts = new Date(record.createdAt);
            if (ts < windowStart || ts > windowEnd) continue;

            if (!isFirst) out.write(',');
            isFirst = false;

            const canContinue = out.write(JSON.stringify(record));
            if (!canContinue) {
                await new Promise<void>((resolve) => out.once('drain', resolve));
            }
        }
    }
}

export async function streamWriteCategory(
    out: NodeJS.WritableStream,
    baseDir: string,
    category: PersistenceCategory,
    dates: string[],
    window: SessionWindow,
    isLast: boolean = false
): Promise<void> {
    out.write(`"${category}":[`);
    await streamWriteCategoryRecords(out, baseDir, category, dates, window);
    out.write(isLast ? ']' : '],');
}
