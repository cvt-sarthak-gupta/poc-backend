declare global {
  namespace Express {
    interface Request {
      tenantId?: number;
    }
  }
}

export {};
