import express from 'express';
import path from 'path';

export function attachDashboard(
    app: express.Express,
    routePath: string = '/dashboard'
): void {
    const staticAssetsPath = path.resolve(__dirname, '../../../dashboard/out');

    app.use(routePath, express.static(staticAssetsPath));

    app.get(`${routePath}/*`, (req, res) => {
        res.sendFile(path.join(staticAssetsPath, 'index.html'));
    });
}