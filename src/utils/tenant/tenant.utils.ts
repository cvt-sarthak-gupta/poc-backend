import { Request } from 'express';
import { EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { TenantDbManager } from '../../tenants/datasource';

export async function getTenantRepository<T extends ObjectLiteral>(req: Request, entity: EntityTarget<T>): Promise<Repository<T>> {
  // tenantId must be set by TenantMiddleware.identify() before reaching this point
  const tenantId = req.tenantId;
  if (!tenantId) throw new Error('Tenant context missing from request — ensure TenantMiddleware.identify runs before this route');
  const conn = await TenantDbManager.getInstance().getConnection(tenantId);
  return conn.getRepository(entity);
}
