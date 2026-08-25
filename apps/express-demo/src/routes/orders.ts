import express from 'express';
import { orderService } from '../services';

export function attachOrderRoutes(app: express.Application) {
    app.post(
        '/api/orders',
        async (req, res, next) => {
            try {
                const {
                    userId,
                    items,
                } = req.body;

                const order =
                    await orderService.createOrder(
                        userId,
                        items,
                    );

                res.status(201).json(order);
            } catch (error) {
                next(error);
            }
        },
    );
}
