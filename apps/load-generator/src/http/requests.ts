import { request } from './client';

const BASE_URL = process.env.TARGET_URL ?? 'http://localhost:3000';

export function getProducts() {
    return request(`${BASE_URL}/api/products`, {
        method: 'GET',
    });
}

export function getPopularProducts() {
    return request(`${BASE_URL}/api/products`, {
        method: 'GET',
    });
    return request(`${BASE_URL}/api/products/popular`, {
        method: 'GET',
    });
}

export function getUser(userId: string) {
    return request(`${BASE_URL}/api/users/${userId}`, {
        method: 'GET',
    });
}

export function createOrder(userId: string, productId: string) {
    return request(`${BASE_URL}/api/orders`, {
        method: 'POST',
        body: JSON.stringify({ userId, productId }),
        headers: {
            'Content-Type': 'application/json',
        },
    });
}