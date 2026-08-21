import {
    endpoints,
    TOTAL_WEIGHT
} from "./config";

/**
 * Generates a random integer between min and max (inclusive).
 * @param min Minimum integer value (inclusive).
 * @param max Maximum integer value (inclusive).
 * @returns A random integer between min and max.
 */
export function random(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random boolean value based on the given probability.
 * @param value A number between 0 and 1 representing the probability of returning true.
 * @returns A boolean value that is true with the specified probability and false otherwise.
 */
export function probability(value: number) {
    return Math.random() < value;
}

/**
 * Picks a random endpoint from the list of endpoints based on their weights.
 * @returns The selected endpoint object.
 */
export function pickEndpoint() {
    let r = Math.random() * TOTAL_WEIGHT;
    for (const endpoint of endpoints) {
        r -= endpoint.weight;
        if (r <= 0) { return endpoint; }
    }
    return endpoints[0];
}

/**
 * Generates a random IP address in the format of "X.X.X.X", where each octet is a random integer within specified ranges.
 * @returns A string representing the generated IP address.
 */
export function randomIp() {
    return [
        random(10, 250),
        random(0, 255),
        random(0, 255),
        random(1, 254)
    ].join(".");
}