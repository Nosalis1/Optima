import express from 'express';
import path from 'path';
import fs from 'fs';
import Logger from '../core/telemetry/logger';
import type { PersistenceLayer } from '../core/storage';

export function attachDashboard(
    app: express.Express,
    routePath: string = '/dashboard',
    persistence: PersistenceLayer
): void {
    const dashboardDir = path.join(__dirname, '../../dashboard-out');
    const indexHtmlPath = path.join(dashboardDir, 'index.html');

    if (!fs.existsSync(indexHtmlPath)) {
        Logger.error(`Dashboard not found at ${indexHtmlPath}. Please build the dashboard first.`);
        return;
    }

    app.get(`${routePath}/session/:sessionNumber/export`, async (req, res) => {
        const sessionNumber = req.params.sessionNumber;
        if (!Number.isFinite(Number(sessionNumber))) {
            res.status(400).send('Invalid session number');
            return;
        }

        const session = await persistence.findSession(Number(sessionNumber));
        if (!session) {
            res.status(404).send('Session not found');
            return;
        }

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="session-${sessionNumber}-full.json"`);

        await persistence.streamSessionExport(res, Number(sessionNumber));
        res.end();
    });

    app.use(routePath, express.static(dashboardDir));

    app.get(`${routePath}*`, (
        req: express.Request,
        res: express.Response
    ) => {
        res.sendFile(indexHtmlPath);
    });


}