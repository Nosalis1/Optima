import type { SimulationService } from "../simulation/simulation.service";

export class NotificationService {
    constructor(
        private readonly simulation: SimulationService,
    ) { }

    async sendOrderConfirmation(
        userId: string,
    ) {
        await this.simulation.delay(
            'notification',
            30
        );

        return {
            sent: true,
            userId
        };
    }
}