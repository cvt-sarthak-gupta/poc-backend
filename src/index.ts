import 'reflect-metadata';
import 'dotenv/config';
import app from './app';
import { initializeApiRoutes } from './routes';
import { AdminDataSource } from './infrastructure/database/admin.datasource';
import { TenantDbManager } from './infrastructure/database/tenant-db.manager';
import logger from './infrastructure/logger';
import { config } from './config';

const PORT = config.port;

async function bootstrap(): Promise<void> {
  await AdminDataSource.initialize();
  logger.info('Admin DB connected');

  await initializeApiRoutes();
  logger.info('Routes initialized');

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT }, 'Server started');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down…');
    server.close(async () => {
      await TenantDbManager.getInstance().closeAll();
      if (AdminDataSource.isInitialized) await AdminDataSource.destroy();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
});
