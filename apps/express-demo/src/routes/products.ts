import express from 'express';
import { cpuService, productService } from '../services';

export function attachProductRoutes(app: express.Application) {
    app.get(
        '/api/products',
        async (req, res, next) => {
            try {
                const products = await productService.findProducts([
                    '1', '2', '3'
                ]);

                res.json(products);
            } catch (error) {
                next(error);
            }
        },
    )

    app.get(
        '/api/products/popular',
        async (req, res, next) => {
            try {
                cpuService.simulateHeavyCalculation(1500);
                res.json({ message: 'Popular products calculated' });
            } catch (error) {
                next(error);
            }
        },
    )
}