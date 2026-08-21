import { expect, describe, test } from '@jest/globals';
import * as Pagination from './pagination';

describe('Pagination Utility', () => {
    const items = Array.from({ length: 100 }, (_, i) => i + 1); // [1, 2, ..., 100] 

    test('constructData returns correct slice of items', () => {
        const page = 2;
        const pageSize = 10;
        const result = Pagination.constructData(items, page, pageSize);
        expect(result).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
    });

    test('constructMeta returns correct metadata', () => {
        const total = items.length;
        const page = 3;
        const pageSize = 15;
        const result = Pagination.constructMeta(total, page, pageSize);
        expect(result).toEqual({
            page: 3,
            pageSize: 15,
            perPageCount: 15,
            totalCount: total,
        });
    });

    test('paginate returns correct data and metadata', () => {
        const page = 4;
        const pageSize = 20;
        const result = Pagination.paginate(items, page, pageSize);
        expect(result.data).toEqual([61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80]);
        expect(result.meta).toEqual({
            page: 4,
            pageSize: 20,
            perPageCount: 20,
            totalCount: items.length,
        });
    });
});