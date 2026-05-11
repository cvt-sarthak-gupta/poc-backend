import { z } from 'zod';
import { BaseValidator } from '../../common/base.validator';

const listSchema = z
  .object({
    page: z.number().int().positive().optional().default(1),
    limit: z.number().int().positive().max(100).optional().default(10),
    filterConditions: z
      .object({
        search: z.string().optional(),
        isActive: z.boolean().optional(),
        orderBy: z.string().optional(),
        order: z.enum(['asc', 'desc']).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type TenantListInput = z.infer<typeof listSchema>;

export class TenantValidator extends BaseValidator {
  constructor() {
    super({ list: listSchema });
  }
}
