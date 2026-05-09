import { Request, Response, NextFunction } from 'express';

export abstract class BaseAuthMiddleware {
  protected allowedRoles: string[] = [];

  constructor(allowedRoles: string[] = []) {
    this.allowedRoles = allowedRoles;
  }

  protected forbidden(res: Response): void {
    res.status(403).json({ status: 'error', statusCode: 403, errorCode: 'FORBIDDEN', errors: [{ message: 'Permission denied' }] });
  }

  // TODO (Week 2+): implement role checks once RBAC is introduced
  public async authorizeAll(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    next();
  }

  public async authorizeCreate(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    next();
  }

  public async authorizeUpdate(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    next();
  }

  public async authorizeDestroy(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    next();
  }
}
