import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny } from 'zod';
import { SomethingWentWrongError } from '../errors';
import ValidationError from '../errors/validationError';

class BaseValidator {
  private readonly schemas: Partial<Record<string, ZodTypeAny>> = {};

  constructor(schemas: Partial<Record<string, ZodTypeAny>>) {
    this.schemas = schemas;
  }

  public middleware(operation: string, source: 'body' | 'query' | 'params' = 'body') {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const schema = this.schemas[operation];
        if (!schema) {
          const errors = new SomethingWentWrongError(`Validation schema not defined for operation "${operation}"`);
          res.status(errors.statusCode).json(errors.json());
          return;
        }

        const data = req[source];
        const result = await schema.safeParseAsync(data);

        if (!result.success) {
          const errors = new ValidationError(result.error);
          res.status(errors.statusCode).json(errors.json());
          return;
        }

        req.validatedData = { ...req.validatedData, ...result.data };
        next();
      } catch (err) {
        next(err);
      }
    };
  }

  public validate<T = unknown>(operation: string, data: unknown): T {
    const schema = this.schemas[operation];
    if (!schema) {
      throw new Error(`Validation schema not defined for operation "${operation}"`);
    }

    const result = schema.safeParse(data);
    if (!result.success) {
      throw new ValidationError(result.error);
    }

    return result.data as T;
  }
}

export { BaseValidator };
