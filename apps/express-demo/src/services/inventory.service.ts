import type { SimulationService } from "../simulation/simulation.service";

export class InventoryService {
    constructor(
        private readonly simulation: SimulationService,
    ) { }

    async reserve(
        items: {
            productId: string;
            quantity: number;
        }[],
    ) {
        await this.simulation.delay(
            'inventory',
            40
        );

        return items.map((item) => ({
            productId: item.productId,
            reserved: Math.random() > 0.1, // 90% chance of success 
        }
        ));
    }
}