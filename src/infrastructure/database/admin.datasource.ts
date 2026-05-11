import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Tenant } from '../../admin/entities/tenant.entity';
import { config } from '../../config';

export const AdminDataSource = new DataSource({
  type: 'postgres',
  host: config.adminDb.host,
  port: config.adminDb.port,
  username: config.adminDb.username,
  password: config.adminDb.password,
  database: config.adminDb.database,
  entities: [Tenant],
  migrations: ['src/admin/migrations/*.ts'],
  synchronize: false,
  logging: config.isDevelopment,
});
