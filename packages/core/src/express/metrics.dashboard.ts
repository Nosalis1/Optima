import express from 'express';
import path from 'path';
import fs from 'fs';
import Logger from '../core/telemetry/logger';

export function attachDashboard(
    app: express.Express,
    routePath: string = '/dashboard'
): void {
    const dashboardDir = path.join(__dirname, '../../dashboard-out');
    const indexHtmlPath = path.join(dashboardDir, 'index.html');

    if (!fs.existsSync(indexHtmlPath)) {
        Logger.error(`Dashboard not found at ${indexHtmlPath}. Please build the dashboard first.`);
        return;
    }

    app.use(routePath, express.static(dashboardDir));

    app.get(`${routePath}*`, (
        req: express.Request,
        res: express.Response
    ) => {
        res.sendFile(indexHtmlPath);
    });
}