import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import apiRouter from './routes';
import { CustomError, ApiRouteNotFoundError } from './errors';
import logger from './infrastructure/logger';
import { config } from './config';

const app = express();

app.use(cors({ origin: config.cors.origin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/v1', apiRouter);

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
