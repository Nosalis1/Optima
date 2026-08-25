import express from 'express';
import {
    attachOrderRoutes,
    attachProductRoutes,
    attachUserRoutes
} from './routes';
import { setupOptima } from 'apm-optima/express';
import { simulationService } from './services';
import TestCaseService from './simulation/test-case.service';

const workTime = 1000 * 60 * 2;
const testCaseService = new TestCaseService(workTime);

const app = express();

app.use(express.json());

const optima = setupOptima(app, {
    dashboardPath: '/optima-metrics',
    simulation: false,
    publisher: {
        intervalMs: 1000,
        slowLatencyThresholdMs: 500,
        eventLoopLagThresholdMs: 100,
        eventLoopResolutionMs: 20,
    },
    tickIntervalMs: 250,
    consoleLog: true,
});

app.get('/api/hello', (req, res) => {
    res.json({ message: 'Hello, World!' });
});

app.post(
    '/api/simulation/scenario',
    (req, res) => {
        simulationService.setScenario(req.body.scenario);

        res.json({ message: `Simulation scenario set to ${simulationService.getScenario()}` });
    }
)

attachUserRoutes(app);

attachProductRoutes(app);

attachOrderRoutes(app);

const server = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

const stopMetrics = optima.attachServer(server);

const stopTestCase = testCaseService.start();

function shutdown() {
    console.log('Shutting down gracefully...');
    stopTestCase();
    stopMetrics();

    testCaseService.compareTestRuns();

    server.close(() => {
        console.log('Server closed.');
        process.exit(0);
    });
}

setTimeout(() => {
    console.log('Simulation time completed. Shutting down...');
    shutdown();
}, workTime);

process.on("uncaughtException", err => console.error(err))

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
