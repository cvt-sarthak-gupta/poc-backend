import { BaseApiRoutes } from '../../common/base.routes';
import { TenantController } from './tenant.controller';
import { TenantValidator } from './tenant.validator';

export default class TenantAdminRoutes extends BaseApiRoutes {
  constructor() {
    super('/admin/tenants');
  }

  protected initializeRoutes(): void {
    const controller = new TenantController();
    const validator = new TenantValidator();

    this.addRestRoutes(controller, {
      index: [validator.middleware('list')],
    });
  }
}
