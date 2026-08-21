import type {
    PaginationMeta
} from "../domain";

export function constructData<T>(
    items: T[],
    page: number,
    pageSize: number
): T[] {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
}

export function constructMeta(
    total: number,
    page: number,
    pageSize: number
): PaginationMeta {
    return {
        page,
        pageSize,
        perPageCount: Math.min(pageSize, total),
        totalCount: total,
    };
}

type PaginationResult<T> = {
    data: T[];
    meta: PaginationMeta;
}

export function paginate<T>(
    items: T[],
    page: number,
    pageSize: number
): PaginationResult<T> {
    return {
        data: constructData<T>(items, page, pageSize),
        meta: constructMeta(items.length, page, pageSize),
    }
}
