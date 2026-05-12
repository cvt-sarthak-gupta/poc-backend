import { AdminDataSource } from '../../infrastructure/database/admin.datasource';
import { TenantDbManager } from '../../infrastructure/database/tenant-db.manager';
import { Tenant } from '../../admin/entities/tenant.entity';
import { Order } from '../entities/order.entity';
import { TenantOrderBatch, flattenWithTenantMeta, sortByCreatedAt, paginateSlice, sumCounts } from './order.helper';

export interface CrossTenantIndexParams {
  page: number;
  limit: number;
  order: 'ASC' | 'DESC';
  tenantIds?: number[];
  search?: string;
}

export interface CrossTenantIndexResult {
  records: Record<string, unknown>[];
  totalRecords: number;
  totalPages: number;
}

export class OrderService {
  private readonly tenantDbManager = TenantDbManager.getInstance();

  async indexAllTenants(params: CrossTenantIndexParams): Promise<CrossTenantIndexResult> {
    const { page, limit, order, tenantIds, search } = params;

    const tenants = await this.fetchActiveTenants(tenantIds);
    if (tenants.length === 0) {
      return { records: [], totalRecords: 0, totalPages: 0 };
    }

    const settled = await Promise.allSettled(
      tenants.map((tenant) => this.fetchBatchFromTenant(tenant, page * limit, order, search))
    );

    const fulfilled = settled
      .filter((r): r is PromiseFulfilledResult<TenantOrderBatch> => r.status === 'fulfilled')
      .map((r) => r.value);

    const totalRecords = sumCounts(fulfilled);
    const merged = sortByCreatedAt(flattenWithTenantMeta(fulfilled), order);
    const records = paginateSlice(merged, page, limit);

    return { records, totalRecords, totalPages: Math.ceil(totalRecords / limit) };
  }

  private async fetchActiveTenants(tenantIds?: number[]): Promise<Tenant[]> {
    const qb = AdminDataSource.getRepository(Tenant)
      .createQueryBuilder('tenant')
      .where('tenant.isActive = :isActive', { isActive: true });

    if (tenantIds?.length) {
      qb.andWhere('tenant.id IN (:...tenantIds)', { tenantIds });
    }

    return qb.getMany();
  }

  private async fetchBatchFromTenant(tenant: Tenant, take: number, order: 'ASC' | 'DESC', search?: string): Promise<TenantOrderBatch> {
    const conn = await this.tenantDbManager.getConnection(tenant.id);
    const repo = conn.getRepository(Order);

    if (search) {
      const searchExpressions = ['order.orderNumber', 'CAST(order.currency AS TEXT)', 'CAST(order.totalAmount AS TEXT)'];
      const qb = repo
        .createQueryBuilder('order')
        .where(`(${searchExpressions.map((expr) => `${expr} ILIKE :search`).join(' OR ')})`, { search: `%${search}%` })
        .orderBy('order.createdAt', order)
        .take(take);
      const [orders, count] = await qb.getManyAndCount();
      return { tenantId: tenant.id, tenantName: tenant.organizationName, tenantSubDomain: tenant.subDomain, orders: orders as unknown as Record<string, unknown>[], count };
    }

    const [orders, count] = await repo.findAndCount({ take, order: { createdAt: order } });
    return { tenantId: tenant.id, tenantName: tenant.organizationName, tenantSubDomain: tenant.subDomain, orders: orders as unknown as Record<string, unknown>[], count };
  }
}
