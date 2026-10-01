import type { Request, Response, NextFunction } from 'express';
import type { PersistenceRepository } from '../core/storage';

const EXPORT_PATH = /\/session\/(\d+)\/export\/?$/;

export const sessionExportRoute = (dashboardPath: string) => `${dashboardPath}/session/:sessionNumber/export`;

export function createSessionExportHandler(persistence: PersistenceRepository) {
    return async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
        const match = EXPORT_PATH.exec(req.originalUrl.split('?')[0]);
        if (!match) {
            if (next) next();
            else res.status(400).send('Invalid session number');
            return;
        }
        const sessionNumber = Number(match[1]);

        const session = await persistence.findSession(sessionNumber);
        if (!session) {
            res.status(404).send('Session not found');
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="session-${sessionNumber}-full.json"`);

        await persistence.streamSessionExport(res, sessionNumber);
        res.end();
    };
}
