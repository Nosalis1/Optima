import type { SimulationService } from "../simulation/simulation.service";

export class UserService {
    constructor(
        private readonly simulation: SimulationService,
    ) { }

    async findById(userId: string) {
        await this.simulation.delay(
            'user-db',
            20
        );

        return {
            id: userId,
            name: 'Test User',
            email: 'test@example.com'
        };
    }
}