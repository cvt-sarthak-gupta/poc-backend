import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Tenant } from '../../admin/entities/tenant.entity';

export const AdminDataSource = new DataSource({
  type: 'postgres',
  host: process.env.ADMIN_DB_HOST ?? 'localhost',
  port: Number(process.env.ADMIN_DB_PORT ?? 5432),
  username: process.env.ADMIN_DB_USER ?? 'postgres',
  password: process.env.ADMIN_DB_PASSWORD ?? 'postgres',
  database: process.env.ADMIN_DB_NAME ?? 'pip_admin',
  entities: [Tenant],
  migrations: ['src/admin/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
