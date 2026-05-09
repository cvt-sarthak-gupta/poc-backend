import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import { OrderRoutes } from './tenants/orders';
import { CustomError } from './errors';
import { ApiRouteNotFoundError } from './errors';
import logger from './infrastructure/logger';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const v1 = express.Router();
v1.use(new OrderRoutes().router);

app.use('/api/v1', v1);

app.use((_req, res) => {
  const err = new ApiRouteNotFoundError();
  res.status(err.statusCode).json(err.json());
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof CustomError) {
    res.status(err.statusCode).json(err.json());
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ status: 'error', statusCode: 500, errorCode: 'SOMETHING_WENT_WRONG', errors: [{ message: 'Internal server error' }] });
});

export default app;
