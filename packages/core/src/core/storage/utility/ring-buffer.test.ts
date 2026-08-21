import { expect, describe, it } from '@jest/globals';
import { RingBuffer } from "./ring-buffer";

describe("RingBuffer", () => {
    it("should push and retrieve values correctly", () => {
        const buffer = new RingBuffer<number>(3);
        buffer.push(1);
        buffer.push(2);
        expect(buffer.values()).toEqual([1, 2]);
        buffer.push(3);
        expect(buffer.values()).toEqual([1, 2, 3]);
        buffer.push(4);
        expect(buffer.values()).toEqual([2, 3, 4]);
    });

    it("should return the latest value correctly", () => {
        const buffer = new RingBuffer<number>(3);
        expect(buffer.latest()).toBeUndefined();
        buffer.push(1);
        expect(buffer.latest()).toBe(1);
        buffer.push(2);
        expect(buffer.latest()).toBe(2);
    });

    it("should clear the buffer correctly", () => {
        const buffer = new RingBuffer<number>(3);
        buffer.push(1);
        buffer.push(2);
        buffer.clear();
        expect(buffer.values()).toEqual([]);
        expect(buffer.latest()).toBeUndefined();
    });

    it("should return the correct size", () => {
        const buffer = new RingBuffer<number>(3);
        expect(buffer.size()).toBe(0);
        buffer.push(1);
        expect(buffer.size()).toBe(1);
        buffer.push(2);
        expect(buffer.size()).toBe(2);
        buffer.push(3);
        expect(buffer.size()).toBe(3);
        buffer.push(4);
        expect(buffer.size()).toBe(3); // size should not exceed capacity
    });
});