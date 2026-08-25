import {
    getProducts,
    getPopularProducts,
    getUser,
    createOrder
} from '../http/requests';

export type Task =
    | 'products'
    | 'popular'
    | 'user'
    | 'order';

export async function executeTask(task: Task) {
    switch (task) {
        case 'products':
            return getProducts();

        case 'popular':
            return getPopularProducts();

        case 'user':
            return getUser(
                `user-${Math.floor(
                    Math.random() * 100,
                ) + 1
                }`,
            );

        case 'user':
            return getUser(
                `user-${Math.floor(
                    Math.random() * 100,
                ) + 1
                }`,
            );

        case 'order':
            return createOrder(
                `user-${Math.floor(
                    Math.random() * 100,
                ) + 1
                }`,
                `product-${Math.floor(
                    Math.random() * 100,
                ) + 1
                }`,
            );
    }
}