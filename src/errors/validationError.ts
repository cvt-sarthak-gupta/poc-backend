import { ZodError } from 'zod';
import { API_ERROR_CODES } from './apiErrorCodes';
import { CustomError } from './customError';

class ValidationError extends CustomError {
  statusCode = 422;
  public errors: { field: string; message: string }[];

  constructor(zodError: ZodError) {
    super('Validation failed', 'ValidationError', API_ERROR_CODES.VALIDATION_ERROR);
    this.name = 'ValidationError';
    this.errors = zodError.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
      errorCode: (err as any).params?.errorCode ?? 'VALIDATION_ERROR',
    }));
  }

  json() {
    return {
      status: 'error',
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      errors: this.errors,
    };
  }
}

export default ValidationError;
