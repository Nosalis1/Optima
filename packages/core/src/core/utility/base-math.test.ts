import { expect, describe, it } from '@jest/globals';
import * as BaseMath from './base-math';

describe('BaseMath', () => {
    it('should clamp a value between min and max', () => {
        expect(BaseMath.clamp(5, 1, 10)).toBe(5);
        expect(BaseMath.clamp(-5, 1, 10)).toBe(1);
        expect(BaseMath.clamp(15, 1, 10)).toBe(10);
    });

    it('should convert a value to percentage and clamp between 0 and 100', () => {
        expect(BaseMath.toPercentage(50, 200)).toBe(25);
        expect(BaseMath.toPercentage(250, 200)).toBe(100);
        expect(BaseMath.toPercentage(-50, 200)).toBe(0);
        expect(BaseMath.toPercentage(50, 0)).toBe(0); // Avoid division by zero
    });
});