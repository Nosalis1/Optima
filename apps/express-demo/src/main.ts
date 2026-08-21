import express from 'express';

import { setupOptima } from '@optima-apm/core/express';

const app = express();

app.use(express.json());

const optima = setupOptima(app, {
    dashboardPath: '/optima-metrics',
    simulation: {
        intervalMs: 100,
        requestsPerTick: 20,
    },
    publisher: {
        intervalMs: 1000,
        slowLatencyThresholdMs: 500,
        eventLoopLagThresholdMs: 100,
        eventLoopResolutionMs: 20,
    },
    tickIntervalMs: 250,
});

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

const stopMetrics = optima.attachServer(server);

function shutdown() {
    console.log('Shutting down gracefully...');
    stopMetrics();
    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
}

process.on("uncaughtException", err => console.error(err))

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
