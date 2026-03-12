import { buildPaginatedResult } from './pagination.util';

describe('buildPaginatedResult', () => {
  it('creates pagination metadata correctly', () => {
    const result = buildPaginatedResult([{ id: 1 }, { id: 2 }], 35, {
      page: 2,
      limit: 10,
      sortOrder: 'desc',
    } as any);

    expect(result.items).toHaveLength(2);
    expect(result.meta).toEqual({
      page: 2,
      limit: 10,
      total: 35,
      totalPages: 4,
    });
  });
});
