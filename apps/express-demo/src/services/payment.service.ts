import type { SimulationService } from "../simulation/simulation.service";

export class PaymentService {
    constructor(
        private readonly simulation: SimulationService,
    ) { }

    async charge(
        userId: string,
        amount: number,
    ) {
        await this.simulation.delay(
            'payment',
            80
        );

        if (this.simulation.shouldFail('payment')) {
            throw new Error('Payment provider unavailable');
        }

        return {
            transactionId: `txn_${Math.floor(Math.random() * 1000000)}`,
            userId,
            amount,
            status: 'success',
        };
    }
}