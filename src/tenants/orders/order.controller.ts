import { Request, Response } from 'express';
import { BaseController } from '../../common/base.controller';
import { Order } from '../entities/order.entity';
import { OrderService } from './order.service';
import { IndexAllTenantsInput } from './order.validator';

export class OrderController extends BaseController {
  private readonly orderService: OrderService;

  constructor(orderService: OrderService = new OrderService()) {
    super(Order);
    this.orderService = orderService;
  }

  protected getValidOrderByFields(): string[] {
    return ['id', 'orderNumber', 'status', 'totalAmount', 'currency', 'createdAt', 'updatedAt'];
  }



  public async indexAllTenants(req: Request, res: Response): Promise<void> {
    try {
      const { page, limit, order, tenantIds, status, currency, search } = req.validatedData as IndexAllTenantsInput;

      const result = await this.orderService.indexAllTenants({ page, limit, order, tenantIds, status, currency, search });

      res.status(200).json({
        status: 'success',
        pagination: {
          page,
          limit,
          totalRecords: result.totalRecords,
          totalPages: result.totalPages,
          nextPage: page < result.totalPages,
          prevPage: page > 1,
        },
        data: result.records,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }
}
