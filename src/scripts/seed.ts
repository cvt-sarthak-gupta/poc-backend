import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AdminDataSource } from '../infrastructure/database/admin.datasource';
import { Tenant } from '../admin/entities/tenant.entity';
import { Order, OrderStatus, OrderCurrency } from '../tenants/entities/order.entity';
import logger from '../infrastructure/logger';

const STATUSES = Object.values(OrderStatus);
const CURRENCIES = Object.values(OrderCurrency);
const ORDERS_PER_TENANT = 150;

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

// Returns a random timestamp between `maxDaysAgo` days ago and now
function randomPastDate(maxDaysAgo = 730): Date {
  const msAgo = Math.random() * maxDaysAgo * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - msAgo);
}

async function seedTenant(tenant: Tenant): Promise<void> {
  // synchronize: true creates the orders table + enums if they don't exist yet
  const ds = new DataSource({
    type: 'postgres',
    url: tenant.dbUrl,
    entities: [Order],
    synchronize: true,
    logging: false,
  });

  await ds.initialize();

  const repo = ds.getRepository(Order);
  const BATCH = 50;

  for (let start = 0; start < ORDERS_PER_TENANT; start += BATCH) {
    const batchSize = Math.min(BATCH, ORDERS_PER_TENANT - start);
    const targetDates: Date[] = [];

    const orders = Array.from({ length: batchSize }, (_, i) => {
      const createdAt = randomPastDate(730);
      targetDates.push(createdAt);
      return repo.create({
        orderNumber: `ORD-${tenant.id}-${Date.now()}-${String(start + i).padStart(5, '0')}`,
        status: randomItem(STATUSES),
        totalAmount: randomFloat(10, 10000),
        currency: randomItem(CURRENCIES),
        metadata: { seeded: true, tenantId: tenant.id },
      });
    });

    const saved = await repo.save(orders);

    // repo.save() forces updatedAt = NOW(); patch both timestamps via a single unnest query
    await ds.query(
      `UPDATE orders
       SET created_at = v.ts, updated_at = v.ts
       FROM (SELECT unnest($1::int[]) AS id, unnest($2::timestamptz[]) AS ts) v
       WHERE orders.id = v.id`,
      [saved.map((o) => o.id), targetDates],
    );
  }

  logger.info({ tenantId: tenant.id, org: tenant.organizationName, count: ORDERS_PER_TENANT }, 'Seeded tenant');
  await ds.destroy();
}

async function main(): Promise<void> {
  await AdminDataSource.initialize();
  logger.info('Admin DB connected');

  const tenants = await AdminDataSource.getRepository(Tenant).find({ where: { isActive: true } });

  if (tenants.length === 0) {
    logger.warn('No active tenants in admin DB — nothing to seed');
    await AdminDataSource.destroy();
    process.exit(0);
  }

  logger.info({ tenantCount: tenants.length, ordersPerTenant: ORDERS_PER_TENANT }, 'Starting seed');

  for (const tenant of tenants) {
    if (!tenant.dbUrl) {
      logger.warn({ tenantId: tenant.id, org: tenant.organizationName }, 'No dbUrl — skipping');
      continue;
    }
    try {
      await seedTenant(tenant);
    } catch (err) {
      logger.error({ err, tenantId: tenant.id }, 'Failed to seed tenant — continuing with next');
    }
  }

  await AdminDataSource.destroy();
  logger.info('Seed complete');
}

main().catch((err) => {
  logger.error({ err }, 'Seed script crashed');
  process.exit(1);
});
