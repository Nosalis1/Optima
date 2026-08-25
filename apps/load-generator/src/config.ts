import type { Task } from './generator/worker';

export interface WorkloadDistribution {
    task: Task;
    weight: number;
}

export const ecommerceWorkload: WorkloadDistribution[] = [
    { task: 'products', weight: 50 },
    { task: 'popular', weight: 20 },
    { task: 'user', weight: 20 },
    { task: 'order', weight: 10 },
];

export function selectTask(
    distribution: WorkloadDistribution[],
): Task {
    const random = Math.random() * 100;

    let accumulated = 0;

    for (const entry of distribution) {
        accumulated += entry.weight;

        if (random < accumulated) {
            return entry.task;
        }
    }

    return distribution[
        distribution.length - 1
    ].task;
}