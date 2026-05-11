export interface TenantOrderBatch {
  tenantId: number;
  tenantName: string;
  tenantSubDomain: string;
  orders: Record<string, unknown>[];
  count: number;
}

export function flattenWithTenantMeta(batches: TenantOrderBatch[]): Record<string, unknown>[] {
  const merged: Record<string, unknown>[] = [];
  for (const batch of batches) {
    for (const order of batch.orders) {
      merged.push({ ...order, tenantId: batch.tenantId, tenantName: batch.tenantName, tenantSubDomain: batch.tenantSubDomain });
    }
  }
  return merged;
}

export function sortByCreatedAt(records: Record<string, unknown>[], direction: 'ASC' | 'DESC'): Record<string, unknown>[] {
  return records.slice().sort((a, b) => {
    const diff = new Date(a.createdAt as string).getTime() - new Date(b.createdAt as string).getTime();
    return direction === 'DESC' ? -diff : diff;
  });
}

export function paginateSlice(records: Record<string, unknown>[], page: number, limit: number): Record<string, unknown>[] {
  return records.slice((page - 1) * limit, page * limit);
}

export function sumCounts(batches: TenantOrderBatch[]): number {
  return batches.reduce((acc, b) => acc + b.count, 0);
}
