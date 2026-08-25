import { setTimeout as sleep } from 'node:timers/promises';

export type SimulationScenario =
    | 'normal'
    | 'slow-db'
    | 'slow-payment'
    | 'slow-inventory'
    | 'errors'
    | 'event-loop';

export class SimulationService {
    private scenario: SimulationScenario = 'normal';

    setScenario(scenario: SimulationScenario): void {
        this.scenario = scenario;
        console.log(`Simulation scenario set to: ${scenario}`);
    }

    getScenario(): SimulationScenario {
        return this.scenario;
    }

    async delay(
        service: string,
        normalMs: number,
    ): Promise<void> {
        let delay = normalMs;

        switch (this.scenario) {
            case 'slow-db':
                if (
                    service === 'user-db' ||
                    service === 'product-db'
                ) {
                    delay = 800;
                }
                break;

            case 'slow-payment':
                if (service === 'payment') {
                    delay = 2000;
                }
                break;

            case 'slow-inventory':
                if (service === 'inventory') {
                    delay = 1200;
                }
                break;
        }

        await sleep(delay);
    }

    shouldFail(
        service: string,
    ): boolean {
        if (this.scenario !== 'errors') {
            false;
        }

        if (service === 'payment') {
            return Math.random() < 0.5; // 50% chance of failure for payment service
        }

        return false;
    }
}