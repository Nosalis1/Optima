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
    simulation: {
        intervalMs: 200,
        requestsPerTick: 25,
    },
    publisher: {
        intervalMs: 1000,
        slowLatencyThresholdMs: 500,
        eventLoopLagThresholdMs: 100,
        eventLoopResolutionMs: 20,
    },
    persistence: {
        baseDir: 'metrics_data',
        maxBufferSize: 1000,
        persistRawRequests: true,
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

let shutdownPromise: Promise<void> | null = null;

async function shutdown() {
    if (shutdownPromise) {
        console.log('Shutdown already in progress. Please wait...');
        return shutdownPromise;
    }

    shutdownPromise = (async () => {
        console.log('Shutting down the server and metrics...');
        await stopMetrics();
        await stopTestCase();
        testCaseService.compareTestRuns();
        server.close(() => {
            console.log('Server closed.');
            process.exit(0);
        });
        console.log('Shutdown complete.');
    })();
    return shutdownPromise;
}

// setTimeout(() => {
//     console.log('Simulation time completed. Shutting down...');
//     shutdown();
// }, workTime);

process.on("uncaughtException", err => console.error(err))

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
