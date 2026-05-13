import {
  flattenWithTenantMeta,
  sortByCreatedAt,
  paginateSlice,
  sumCounts,
  TenantOrderBatch,
} from '../order.helper';

const makeBatch = (overrides: Partial<TenantOrderBatch> = {}): TenantOrderBatch => ({
  tenantId: 1,
  tenantName: 'Acme',
  tenantSubDomain: 'acme',
  orders: [],
  count: 0,
  ...overrides,
});

const makeOrder = (id: string, createdAt: string): Record<string, unknown> => ({
  id,
  createdAt,
  orderNumber: `ORD-${id}`,
});

describe('sumCounts', () => {
  it('returns 0 for empty batches', () => {
    expect(sumCounts([])).toBe(0);
  });

  it('sums counts across batches', () => {
    const batches = [makeBatch({ count: 10 }), makeBatch({ count: 5 }), makeBatch({ count: 3 })];
    expect(sumCounts(batches)).toBe(18);
  });
});

describe('flattenWithTenantMeta', () => {
  it('returns empty array for empty batches', () => {
    expect(flattenWithTenantMeta([])).toEqual([]);
  });

  it('flattens orders and injects tenant metadata', () => {
    const order = makeOrder('1', '2024-01-01T00:00:00Z');
    const batch = makeBatch({ tenantId: 42, tenantName: 'Beta Corp', tenantSubDomain: 'beta', orders: [order] });

    const result = flattenWithTenantMeta([batch]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ...order,
      tenantId: 42,
      tenantName: 'Beta Corp',
      tenantSubDomain: 'beta',
    });
  });

  it('does not mutate the original order objects', () => {
    const order = makeOrder('1', '2024-01-01T00:00:00Z');
    const batch = makeBatch({ orders: [order] });

    flattenWithTenantMeta([batch]);

    expect(order).not.toHaveProperty('tenantId');
  });

  it('flattens orders from multiple batches preserving all records', () => {
    const batches = [
      makeBatch({ tenantId: 1, orders: [makeOrder('a', '2024-01-01T00:00:00Z'), makeOrder('b', '2024-01-02T00:00:00Z')] }),
      makeBatch({ tenantId: 2, orders: [makeOrder('c', '2024-01-03T00:00:00Z')] }),
    ];

    const result = flattenWithTenantMeta(batches);

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('sortByCreatedAt', () => {
  const orders = [
    makeOrder('1', '2024-01-03T00:00:00Z'),
    makeOrder('2', '2024-01-01T00:00:00Z'),
    makeOrder('3', '2024-01-02T00:00:00Z'),
  ];

  it('sorts DESC (newest first)', () => {
    const result = sortByCreatedAt(orders, 'DESC');
    expect(result.map((r) => r.id)).toEqual(['1', '3', '2']);
  });

  it('sorts ASC (oldest first)', () => {
    const result = sortByCreatedAt(orders, 'ASC');
    expect(result.map((r) => r.id)).toEqual(['2', '3', '1']);
  });

  it('does not mutate the original array', () => {
    const original = [...orders];
    sortByCreatedAt(orders, 'DESC');
    expect(orders.map((r) => r.id)).toEqual(original.map((r) => r.id));
  });

  it('returns empty array unchanged', () => {
    expect(sortByCreatedAt([], 'DESC')).toEqual([]);
  });
});

describe('paginateSlice', () => {
  const records = Array.from({ length: 25 }, (_, i) => makeOrder(String(i + 1), '2024-01-01T00:00:00Z'));

  it('returns first page', () => {
    const result = paginateSlice(records, 1, 10);
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe('1');
    expect(result[9].id).toBe('10');
  });

  it('returns second page', () => {
    const result = paginateSlice(records, 2, 10);
    expect(result).toHaveLength(10);
    expect(result[0].id).toBe('11');
  });

  it('returns partial last page', () => {
    const result = paginateSlice(records, 3, 10);
    expect(result).toHaveLength(5);
    expect(result[0].id).toBe('21');
  });

  it('returns empty array when page is beyond total', () => {
    const result = paginateSlice(records, 10, 10);
    expect(result).toHaveLength(0);
  });
});
