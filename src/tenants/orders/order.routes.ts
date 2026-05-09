import { BaseApiRoutes } from '../../common/base.routes';
import { TenantMiddleware } from '../middlewares/tenant.middleware';
import { OrderController } from './order.controller';

export class OrderRoutes extends BaseApiRoutes {
  constructor() {
    super('/orders');
  }

  protected initializeRoutes(): void {
    const controller = new OrderController();
    this.addRestRoutes(controller, {
      index: [TenantMiddleware.identify],
    });
  }
}
