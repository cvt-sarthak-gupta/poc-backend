import { BaseController } from '../../common/base.controller';
import { Order } from '../entities/order.entity';

export class OrderController extends BaseController {
  constructor() {
    super(Order);
  }

  protected getValidOrderByFields(): string[] {
    return ['id', 'orderNumber', 'status', 'totalAmount', 'currency', 'createdAt', 'updatedAt'];
  }
}
