export type PaginationInput = {
  page: number;
  limit: number;
  filterConditions?: Record<string, unknown>;
};

declare module 'express-serve-static-core' {
  interface Request {
    validatedData?: Record<string, unknown>;
    allowedColumns?: string[];
  }
}
