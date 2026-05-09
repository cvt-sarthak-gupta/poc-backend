import { API_ERROR_CODES } from './apiErrorCodes';
import { CustomError } from './customError';

export class ApiRouteNotFoundError extends CustomError {
  statusCode = 404;

  constructor(message: string = 'API Route does not found.', errorCode: API_ERROR_CODES = API_ERROR_CODES.API_ROUTE_NOT_FOUND) {
    super(message, 'ApiRouteNotFoundError', errorCode);
  }
}
