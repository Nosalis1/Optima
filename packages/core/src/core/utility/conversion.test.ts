import { expect, describe, it } from '@jest/globals';
import * as ConversionUtility from './conversion';

describe('Conversion Utility', () => {
    describe('convertBytes', () => {
        it('should convert bytes to kilobytes', () => {
            expect(ConversionUtility.convertBytes(1024, 'KB')).toBe(1);
        });

        it('should convert bytes to megabytes', () => {
            expect(ConversionUtility.convertBytes(1048576, 'MB')).toBe(1);
        });

        it('should convert bytes to gigabytes', () => {
            expect(ConversionUtility.convertBytes(1073741824, 'GB')).toBe(1);
        });
    });

    describe('convertToBytes', () => {
        it('should convert kilobytes to bytes', () => {
            expect(ConversionUtility.convertToBytes(1, 'KB')).toBe(1024);
        });

        it('should convert megabytes to bytes', () => {
            expect(ConversionUtility.convertToBytes(1, 'MB')).toBe(1048576);
        });

        it('should convert gigabytes to bytes', () => {
            expect(ConversionUtility.convertToBytes(1, 'GB')).toBe(1073741824);
        });
    });

    describe('convertNanoseconds', () => {
        it('should convert nanoseconds to milliseconds', () => {
            expect(ConversionUtility.convertNanoseconds(1000000, 'ms')).toBeCloseTo(1);
        });

        it('should convert nanoseconds to seconds', () => {
            expect(ConversionUtility.convertNanoseconds(1000000000, 's')).toBeCloseTo(1);
        });
    });

    describe('convertToNanoseconds', () => {
        it('should convert milliseconds to nanoseconds', () => {
            expect(ConversionUtility.convertToNanoseconds(1, 'ms')).toBe(1000000);
        });

        it('should convert seconds to nanoseconds', () => {
            expect(ConversionUtility.convertToNanoseconds(1, 's')).toBe(1000000000);
        });
    });
});
