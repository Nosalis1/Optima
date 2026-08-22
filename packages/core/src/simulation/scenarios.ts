import Logger from '../core/telemetry/logger';
import { probability } from './utility';

export const scenario = {
    trafficMultiplier: 1,
    databaseSlowUntil: 0,
    authDownUntil: 0,
    latencySpikeUntil: 0,
    memoryLeak: false,
};

export function updateScenarios() {
    const now = Date.now();

    // traffic spike
    if (now > scenario.latencySpikeUntil && probability(0.002)) {
        scenario.trafficMultiplier = 3;
        scenario.latencySpikeUntil = now + 10000;
        Logger.debug("Traffic spike started");
    }

    if (now > scenario.latencySpikeUntil) {
        scenario.trafficMultiplier = 1;
    }

    // database slowdown
    if (now > scenario.databaseSlowUntil && probability(0.001)) {
        scenario.databaseSlowUntil = now + 12000;
        Logger.debug("Database slowdown");
    }

    // auth outage
    if (now > scenario.authDownUntil && probability(0.0005)) {
        scenario.authDownUntil = now + 8000;
        Logger.debug("Auth outage");
    }

    // memory leak
    if (!scenario.memoryLeak && probability(0.0002)) {
        scenario.memoryLeak = true;
        Logger.debug("Memory leak started");
    }
}

type ScenarioName =
    | "TRAFFIC_SPIKE"
    | "DATABASE_SLOWDOWN"
    | "AUTH_OUTAGE"
    | "MEMORY_LEAK"
    | "RESET";

export class ScenarioController {

    constructor(
        private readonly state: typeof scenario
    ) { }

    start(name: ScenarioName) {
        const now = Date.now();

        switch (name) {
            case "TRAFFIC_SPIKE":
                this.state.trafficMultiplier = 4;
                this.state.latencySpikeUntil = now + 30000;
                Logger.debug("Manual traffic spike!");
                break;

            case "DATABASE_SLOWDOWN":
                this.state.databaseSlowUntil = now + 60000;
                Logger.debug("Manual database slowdown!");
                break;

            case "AUTH_OUTAGE":
                this.state.authDownUntil = now + 30000;
                Logger.debug("Manual auth outage!");
                break;

            case "MEMORY_LEAK":
                this.state.memoryLeak = true;
                Logger.debug("Manual memory leak!");
                break;

            case "RESET":
                this.reset();
                break;
        }
    }

    stop(name: ScenarioName) {
        switch (name) {
            case "TRAFFIC_SPIKE":
                this.state.trafficMultiplier = 1;
                this.state.latencySpikeUntil = 0;
                break;

            case "DATABASE_SLOWDOWN":
                this.state.databaseSlowUntil = 0;
                break;

            case "AUTH_OUTAGE":
                this.state.authDownUntil = 0;
                break;

            case "MEMORY_LEAK":
                this.state.memoryLeak = false;
                break;
        }
    }

    reset() {
        this.state.trafficMultiplier = 1;
        this.state.databaseSlowUntil = 0;
        this.state.authDownUntil = 0;
        this.state.latencySpikeUntil = 0;
        this.state.memoryLeak = false;
        Logger.debug("Scenarios reset!");
    }
}