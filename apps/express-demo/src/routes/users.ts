import express from 'express';
import { userService } from '../services';

export function attachUserRoutes(app: express.Application) {
    app.get(
        '/api/users/:userId',
        async (req, res, next) => {
            try {
                const { userId } = req.params;

                const user = await userService.findById(userId);

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                res.json(user);
            } catch (error) {
                next(error);
            }
        },
    )
}