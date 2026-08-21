export class RingBuffer<T> {
    private readonly buffer: T[];
    private index = 0;
    private count = 0;

    constructor(private readonly capacity: number)
     { this.buffer = new Array<T>(capacity); }

    push(value: T): void {
        this.buffer[this.index] = value;
        this.index = (this.index + 1) % this.capacity;
        if (this.count < this.capacity) {
            this.count++;
        }
    }
    values(): T[] {
        if (this.count === 0) { return []; }
        if (this.count < this.capacity) {
            return this.buffer.slice(0, this.count);
        }
        return [
            ...this.buffer.slice(this.index),
            ...this.buffer.slice(0, this.index),
        ];
    }
    latest(): T | undefined {
        if (this.count === 0) { return undefined; }
        const position = (this.index - 1 + this.capacity) % this.capacity;
        return this.buffer[position];
    }
    clear(): void {
        this.index = 0;
        this.count = 0;
    }
    size(): number {
        return this.count;
    }
}