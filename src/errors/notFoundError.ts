import { API_ERROR_CODES } from './apiErrorCodes';
import { CustomError } from './customError';

export class NotFoundError extends CustomError {
  statusCode = 404;

  constructor(message: string = 'Record not found.', errorCode: API_ERROR_CODES = API_ERROR_CODES.RECORD_NOT_FOUND) {
    super(message, 'NotFoundError', errorCode);
  }
}
