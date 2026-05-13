import { z } from 'zod';
import { BaseValidator } from '../../common/base.validator';
import { OrderCurrency, OrderStatus } from './order.types';

const indexAllTenantsSchema = z
  .object({
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(10),
    order: z
      .enum(['asc', 'desc', 'ASC', 'DESC'])
      .transform((v) => v.toUpperCase() as 'ASC' | 'DESC')
      .default('desc'),
    tenantIds: z.array(z.number().int().positive()).optional(),
    status: z.array(z.nativeEnum(OrderStatus)).optional(),
    currency: z.array(z.nativeEnum(OrderCurrency)).optional(),
    search: z.string().trim().optional(),
  })
  .strict();

export type IndexAllTenantsInput = z.infer<typeof indexAllTenantsSchema>;

export class OrderValidator extends BaseValidator {
  constructor() {
    super({
      indexAllTenants: indexAllTenantsSchema,
    });
  }
}
