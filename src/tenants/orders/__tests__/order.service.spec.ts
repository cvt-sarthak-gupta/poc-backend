import { OrderService, CrossTenantIndexParams } from '../order.service';

// Mock AdminDataSource before any module imports trigger DB connections
jest.mock('../../../infrastructure/database/admin.datasource', () => ({
  AdminDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../infrastructure/database/tenant-db.manager', () => ({
  TenantDbManager: {
    getInstance: jest.fn(),
  },
}));

import { AdminDataSource } from '../../../infrastructure/database/admin.datasource';
import { TenantDbManager } from '../../../infrastructure/database/tenant-db.manager';

const mockAdminDataSource = AdminDataSource as jest.Mocked<typeof AdminDataSource>;
const mockGetInstance = TenantDbManager.getInstance as jest.Mock;

const makeTenant = (id: number, name = `Tenant ${id}`) => ({
  id,
  organizationName: name,
  subDomain: `tenant-${id}`,
  isActive: true,
});

const makeOrder = (id: string) => ({
  id,
  orderNumber: `ORD-${id}`,
  status: 'pending',
  totalAmount: 100,
  currency: 'USD',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  metadata: null,
});

const baseParams: CrossTenantIndexParams = {
  page: 1,
  limit: 10,
  order: 'DESC',
};

describe('OrderService.indexAllTenants', () => {
  let service: OrderService;
  let mockTenantDbManager: { getConnection: jest.Mock };
  let mockQb: ReturnType<typeof makeMockQueryBuilder>;
  let mockRepo: { findAndCount: jest.Mock; createQueryBuilder: jest.Mock };

  const makeMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockQb = makeMockQueryBuilder();
    mockRepo = {
      findAndCount: jest.fn(),
      createQueryBuilder: jest.fn(() => mockQb),
    };

    mockTenantDbManager = {
      getConnection: jest.fn().mockResolvedValue({ getRepository: jest.fn(() => mockRepo) }),
    };

    mockGetInstance.mockReturnValue(mockTenantDbManager);
    service = new OrderService();
  });

  const setupTenantQuery = (tenants: ReturnType<typeof makeTenant>[]) => {
    const qb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(tenants),
    };
    mockAdminDataSource.getRepository.mockReturnValue({ createQueryBuilder: jest.fn(() => qb) } as any);
    return qb;
  };

  it('returns empty result when no active tenants exist', async () => {
    setupTenantQuery([]);

    const result = await service.indexAllTenants(baseParams);

    expect(result).toEqual({ records: [], totalRecords: 0, totalPages: 0 });
  });

  it('fetches orders from each active tenant and aggregates totals', async () => {
    const tenants = [makeTenant(1, 'Alpha'), makeTenant(2, 'Beta')];
    setupTenantQuery(tenants);

    const orderA = makeOrder('a');
    const orderB = makeOrder('b');

    mockTenantDbManager.getConnection
      .mockResolvedValueOnce({ getRepository: () => ({ ...mockRepo, findAndCount: jest.fn().mockResolvedValue([[orderA], 1]) }) })
      .mockResolvedValueOnce({ getRepository: () => ({ ...mockRepo, findAndCount: jest.fn().mockResolvedValue([[orderB], 1]) }) });

    const result = await service.indexAllTenants(baseParams);

    expect(result.totalRecords).toBe(2);
    expect(result.records).toHaveLength(2);
  });

  it('injects tenantId, tenantName, tenantSubDomain onto each record', async () => {
    setupTenantQuery([makeTenant(7, 'Gamma Corp')]);

    const order = makeOrder('x');
    mockTenantDbManager.getConnection.mockResolvedValue({
      getRepository: () => ({ ...mockRepo, findAndCount: jest.fn().mockResolvedValue([[order], 1]) }),
    });

    const result = await service.indexAllTenants(baseParams);

    expect(result.records[0]).toMatchObject({
      tenantId: 7,
      tenantName: 'Gamma Corp',
      tenantSubDomain: 'tenant-7',
    });
  });

  it('filters tenants by tenantIds when provided', async () => {
    const tenantQb = setupTenantQuery([makeTenant(3)]);

    mockTenantDbManager.getConnection.mockResolvedValue({
      getRepository: () => ({ ...mockRepo, findAndCount: jest.fn().mockResolvedValue([[], 0]) }),
    });

    await service.indexAllTenants({ ...baseParams, tenantIds: [3] });

    expect(tenantQb.andWhere).toHaveBeenCalledWith('tenant.id IN (:...tenantIds)', { tenantIds: [3] });
  });

  it('uses QueryBuilder with search expression when search is provided', async () => {
    setupTenantQuery([makeTenant(1)]);

    mockQb.getManyAndCount.mockResolvedValue([[makeOrder('s')], 1]);
    mockTenantDbManager.getConnection.mockResolvedValue({
      getRepository: () => mockRepo,
    });

    const result = await service.indexAllTenants({ ...baseParams, search: 'ORD' });

    expect(mockRepo.createQueryBuilder).toHaveBeenCalled();
    expect(mockQb.where).toHaveBeenCalled();
    expect(result.totalRecords).toBe(1);
  });

  it('returns 0 totalPages when totalRecords is 0', async () => {
    setupTenantQuery([makeTenant(1)]);

    mockTenantDbManager.getConnection.mockResolvedValue({
      getRepository: () => ({ ...mockRepo, findAndCount: jest.fn().mockResolvedValue([[], 0]) }),
    });

    const result = await service.indexAllTenants(baseParams);

    expect(result.totalPages).toBe(0);
  });

  it('still returns results when one tenant connection fails', async () => {
    setupTenantQuery([makeTenant(1, 'Good'), makeTenant(2, 'Bad')]);

    const order = makeOrder('ok');
    mockTenantDbManager.getConnection
      .mockResolvedValueOnce({ getRepository: () => ({ ...mockRepo, findAndCount: jest.fn().mockResolvedValue([[order], 1]) }) })
      .mockRejectedValueOnce(new Error('connection refused'));

    const result = await service.indexAllTenants(baseParams);

    // Only the fulfilled tenant contributes
    expect(result.totalRecords).toBe(1);
    expect(result.records).toHaveLength(1);
  });
});
