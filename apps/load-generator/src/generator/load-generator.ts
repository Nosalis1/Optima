import {
    executeTask,
} from './worker';

import {
    ecommerceWorkload,
    selectTask,
} from '../config';

export interface LoadConfig {
    requestsPerSecond: number;
}

export interface LoadPhase {
    durationMs: number;
    requestsPerSecond: number;
}

export const loadPhases: LoadPhase[] = [
    { durationMs: 60_000, requestsPerSecond: 50 },
    { durationMs: 60_000, requestsPerSecond: 100 },
    { durationMs: 60_000, requestsPerSecond: 250 },
    { durationMs: 60_000, requestsPerSecond: 500 },
    { durationMs: 60_000, requestsPerSecond: 100 },
];

export class LoadGenerator {
    private running = false;

    async run(
        phases: LoadPhase[],
    ) {
        this.running = true;

        for (const phase of phases) {
            if (!this.running) {
                break;
            }

            console.log(
                `[Load] ${phase.requestsPerSecond} RPS for ${phase.durationMs / 1000
                }s`,
            );

            await this.runPhase(
                phase,
            );
        }

        this.running = false;
    }

    private runPhase(
        phase: LoadPhase,
    ): Promise<void> {
        return new Promise(resolve => {
            const interval =
                setInterval(() => {
                    if (!this.running) {
                        clearInterval(interval);
                        resolve();
                        return;
                    }

                    this.generateRequests(
                        phase.requestsPerSecond,
                    );
                }, 1000);

            setTimeout(() => {
                clearInterval(interval);
                resolve();
            }, phase.durationMs);
        });
    }

    private generateRequests(
        count: number,
    ) {
        for (let i = 0; i < count; i++) {
            const task =
                selectTask(
                    ecommerceWorkload,
                );

            executeTask(task)
                .catch(() => { });
        }
    }

    stop() {
        this.running = false;
    }
}