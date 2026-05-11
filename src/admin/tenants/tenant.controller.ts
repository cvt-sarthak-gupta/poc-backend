import { Request } from 'express';
import { Repository } from 'typeorm';
import { AdminDataSource } from '../../infrastructure/database/admin.datasource';
import { BaseController } from '../../common/base.controller';
import { Tenant } from '../entities/tenant.entity';

export class TenantController extends BaseController {
  constructor() {
    super(Tenant);
  }

  protected async getRepository(_req: Request): Promise<Repository<Tenant>> {
    return AdminDataSource.getRepository(Tenant);
  }

  protected getSelectableFields(): string[] {
    return ['id', 'organizationName', 'subDomain', 'isActive'];
  }

  protected getSearchableFields(): string[] {
    return ['organizationName', 'subDomain'];
  }

  protected getValidOrderByFields(): string[] {
    return ['id', 'organizationName', 'subDomain', 'isActive', 'createdAt'];
  }

  protected defaultOrderBy(): Record<string, 'ASC' | 'DESC'> {
    return { organizationName: 'ASC' };
  }
}
