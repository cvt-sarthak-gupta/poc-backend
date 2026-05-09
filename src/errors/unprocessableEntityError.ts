import { API_ERROR_CODES } from './apiErrorCodes';
import { CustomError } from './customError';

export class UnprocessableEntityError extends CustomError {
  statusCode = 422;
  details?: string[];

  constructor(message: string = 'Something went wrong. Please check back again', errorCode: API_ERROR_CODES = API_ERROR_CODES.UNPROCESSABLE_ENTITY, details?: string[]) {
    super(message, 'UnprocessableEntityError', errorCode);
    this.details = details;
  }

  json() {
    const baseJson = super.json();
    if (this.details && this.details.length > 0) {
      return {
        ...baseJson,
        details: this.details,
      };
    }
    return baseJson;
  }
}
