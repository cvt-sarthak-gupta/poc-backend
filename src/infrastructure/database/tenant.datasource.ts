import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';

// Static datasource used only by the TypeORM CLI (migration:generate / migration:run).
// Set TENANT_DB_URL in .env to point at a tenant database.
export const TenantDataSource = new DataSource({
  type: 'postgres',
  url: process.env.TENANT_DB_URL,
  entities: ['src/tenants/**/*.entity.ts'],
  migrations: ['src/tenants/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
