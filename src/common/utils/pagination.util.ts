import { PaginationQueryDto } from '../dto/pagination-query.dto.js';

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginatedMeta;
}

export function buildPaginatedResult<T>(
  items: T[],
  total: number,
  query: PaginationQueryDto,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  return {
    items,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
  };
}
