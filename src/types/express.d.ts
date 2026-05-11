declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
      validatedData?: Record<string, unknown>;
    }
  }
}

export {};
