import { Request, Response, NextFunction } from 'express';

// Resolves tenant context from the x-tenant-id request header.
// In production this would be replaced by JWT-based tenant extraction.
export class TenantMiddleware {
  static identify(req: Request, res: Response, next: NextFunction): void {
    const raw = req.headers['x-tenant-id'];
    const tenantId = parseInt(raw as string, 10);

    if (!raw || isNaN(tenantId) || tenantId <= 0) {
      res.status(400).json({
        status: 'error',
        statusCode: 400,
        errorCode: 'MISSING_TENANT_ID',
        errors: [{ message: 'x-tenant-id header is required and must be a positive integer' }],
      });
      return;
    }

    req.tenantId = tenantId;
    next();
  }
}
