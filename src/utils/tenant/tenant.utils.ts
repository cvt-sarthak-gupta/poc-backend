import { Request } from 'express';
import { EntityTarget, ObjectLiteral, Repository } from 'typeorm';
import { TenantDbManager } from '../../tenants/datasource';

export async function getTenantRepository<T extends ObjectLiteral>(req: Request, entity: EntityTarget<T>): Promise<Repository<T>> {
  // tenantId is set on the request by tenant resolution middleware
  const tenantId = req.tenantId ?? parseInt((req.headers['tenantid'] ?? req.headers['tenantId']) as string);
  if (!tenantId || isNaN(tenantId)) throw new Error('Tenant context missing from request');
  const conn = await TenantDbManager.getInstance().getConnection(tenantId);
  return conn.getRepository(entity);
}
