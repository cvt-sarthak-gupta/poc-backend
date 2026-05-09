import { API_ERROR_CODES } from './apiErrorCodes';
export abstract class CustomError extends Error {
  abstract statusCode: number;
  errorCode: API_ERROR_CODES;

  constructor(message: string, name: string, errorCode: API_ERROR_CODES) {
    super(message);
    this.name = name;
    this.errorCode = errorCode;

    Object.setPrototypeOf(this, new.target.prototype);
  }

  json() {
    return {
      status: 'error',
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      errors: [{ message: this.message }],
    };
  }
}
