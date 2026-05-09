import { API_ERROR_CODES } from './apiErrorCodes';
import { CustomError } from './customError';

export class SomethingWentWrongError extends CustomError {
  statusCode = 422;

  constructor(message: string = 'Something went wrong. Please check back again', errorCode: API_ERROR_CODES = API_ERROR_CODES.SOMETHING_WENT_WRONG) {
    super(message, 'SomethingWentWrongError', errorCode);
  }
}
