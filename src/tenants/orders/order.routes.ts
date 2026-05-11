import { BaseApiRoutes } from '../../common/base.routes';
import { TenantMiddleware } from '../middlewares/tenant.middleware';
import { OrderController } from './order.controller';
import { OrderValidator } from './order.validator';

export default class OrderRoutes extends BaseApiRoutes {
  constructor() {
    super('/orders');
  }

  protected initializeRoutes(): void {
    const controller = new OrderController();
    const validator = new OrderValidator();

    this.router.post(
      `${this.basePath}/admin/all`,
      validator.middleware('indexAllTenants'),
      controller.indexAllTenants.bind(controller)
    );

    this.addRestRoutes(controller, {
      index: [TenantMiddleware.identify],
    });
  }
}
