import 'reflect-metadata';
import { Client } from 'pg';
import { DataSource } from 'typeorm';
import { AdminDataSource } from './admin.datasource';
import { Tenant } from '../../admin/entities/tenant.entity';
import logger from '../logger';

export class TenantDbManager {
  private static instance: TenantDbManager;
  private readonly connections = new Map<number, DataSource>();
  private readonly connectionsByDomain = new Map<string, DataSource>();
  private readonly pendingById = new Map<number, Promise<DataSource>>();
  private readonly pendingByDomain = new Map<string, Promise<DataSource>>();

  private constructor() {}

  static getInstance(): TenantDbManager {
    if (!TenantDbManager.instance) {
      TenantDbManager.instance = new TenantDbManager();
    }
    return TenantDbManager.instance;
  }

  async getConnection(tenantId: number): Promise<DataSource> {
    if (this.connections.has(tenantId)) {
      return this.connections.get(tenantId)!;
    }

    if (this.pendingById.has(tenantId)) {
      return this.pendingById.get(tenantId)!;
    }

    const promise = (async () => {
      const tenant = await AdminDataSource.getRepository(Tenant).findOneBy({ id: tenantId });
      if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
      return this.createConnection(tenantId, tenant.subDomain, tenant.dbUrl);
    })();

    this.pendingById.set(tenantId, promise);
    try {
      const ds = await promise;
      return ds;
    } finally {
      this.pendingById.delete(tenantId);
    }
  }

  async getConnectionByDomain(domain: string): Promise<DataSource> {
    if (this.connectionsByDomain.has(domain)) {
      return this.connectionsByDomain.get(domain)!;
    }

    if (this.pendingByDomain.has(domain)) {
      return this.pendingByDomain.get(domain)!;
    }

    const promise = (async () => {
      const tenant = await AdminDataSource.getRepository(Tenant).findOneBy({ subDomain: domain });
      if (!tenant) throw new Error(`Tenant with domain "${domain}" not found`);
      return this.createConnection(tenant.id, domain, tenant.dbUrl);
    })();

    this.pendingByDomain.set(domain, promise);
    try {
      const ds = await promise;
      return ds;
    } finally {
      this.pendingByDomain.delete(domain);
    }
  }

  // Creates the database if it doesn't exist, then runs all pending migrations.
  // Call this when onboarding a new tenant instead of inserting the row manually.
  async provision(dbUrl: string): Promise<void> {
    const dbName = new URL(dbUrl).pathname.slice(1);

    const maintenanceUrl = new URL(dbUrl);
    maintenanceUrl.pathname = '/postgres';
    const client = new Client({ connectionString: maintenanceUrl.toString() });
    await client.connect();
    try {
      const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
      if (!rowCount) {
        await client.query(`CREATE DATABASE "${dbName}"`);
        logger.info({ dbName }, 'Tenant database created');
      }
    } finally {
      await client.end();
    }

    const ds = this.buildDataSource(dbUrl);
    await ds.initialize();
    await ds.runMigrations();
    await ds.destroy();
    logger.info({ dbName }, 'Tenant database provisioned');
  }

  private buildDataSource(dbUrl: string): DataSource {
    return new DataSource({
      type: 'postgres',
      url: dbUrl,
      entities: [`${__dirname}/../../tenants/entities/*.entity{.ts,.js}`, `${__dirname}/../../tenants/**/*.entity{.ts,.js}`],
      migrations: [`${__dirname}/../../tenants/migrations/*{.ts,.js}`],
      synchronize: false,
      logging: false,
    });
  }

  private async createConnection(tenantId: number, domain: string, dbUrl: string): Promise<DataSource> {
    const ds = this.buildDataSource(dbUrl);
    await ds.initialize();
    await ds.runMigrations();
    this.connections.set(tenantId, ds);
    this.connectionsByDomain.set(domain, ds);
    logger.info({ tenantId, domain }, 'Tenant DB connection established');
    return ds;
  }

  async closeAll(): Promise<void> {
    for (const [, ds] of this.connections) {
      if (ds.isInitialized) await ds.destroy();
    }
    this.connections.clear();
    this.connectionsByDomain.clear();
  }
}
