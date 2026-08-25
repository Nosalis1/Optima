import type { SimulationService } from "../simulation/simulation.service";

export class ProductService {
    constructor(
        private readonly simulation: SimulationService,
    ) { }

    async findProducts(
        productIds: string[],
    ) {
        await this.simulation.delay(
            'product-db',
            30
        );

        return productIds.map((id) => ({
            id,
            name: `Product ${id}`,
            price: Math.floor(Math.random() * 100) + 1,
            stock: Math.floor(Math.random() * 100) + 1,
        }));
    }
}