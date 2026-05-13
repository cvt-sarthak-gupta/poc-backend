import { Request, Response } from 'express';
import { OrderController } from '../order.controller';
import { OrderService } from '../order.service';

jest.mock('../order.service');

const MockOrderService = OrderService as jest.MockedClass<typeof OrderService>;

const makeReq = (validatedData: Record<string, unknown> = {}): Request =>
  ({ validatedData } as unknown as Request);

const makeRes = () => {
  const res = { statusCode: 200 } as unknown as Response & { statusCode: number; body: unknown };
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; }) as any;
  res.json = jest.fn((data: unknown) => { res.body = data; return res; }) as any;
  return res;
};

const makeController = () => {
  const service = new MockOrderService() as jest.Mocked<OrderService>;
  const controller = new OrderController(service);
  return { controller, service };
};

describe('OrderController.indexAllTenants', () => {
  it('returns 200 with paginated data on success', async () => {
    const { controller, service } = makeController();

    service.indexAllTenants.mockResolvedValue({
      records: [{ id: '1', orderNumber: 'ORD-001' }],
      totalRecords: 1,
      totalPages: 1,
    });

    const req = makeReq({ page: 1, limit: 10, order: 'DESC' });
    const res = makeRes();

    await controller.indexAllTenants(req, res);

    expect(res.statusCode).toBe(200);
    const body = res.body as any;
    expect(body.status).toBe('success');
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 10,
      totalRecords: 1,
      totalPages: 1,
      nextPage: false,
      prevPage: false,
    });
  });

  it('passes all params from validatedData to the service', async () => {
    const { controller, service } = makeController();

    service.indexAllTenants.mockResolvedValue({ records: [], totalRecords: 0, totalPages: 0 });

    const req = makeReq({ page: 2, limit: 5, order: 'ASC', tenantIds: [1, 2], search: 'ORD' });
    const res = makeRes();

    await controller.indexAllTenants(req, res);

    expect(service.indexAllTenants).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      order: 'ASC',
      tenantIds: [1, 2],
      search: 'ORD',
    });
  });

  it('computes nextPage=true when more pages exist', async () => {
    const { controller, service } = makeController();

    service.indexAllTenants.mockResolvedValue({ records: [], totalRecords: 30, totalPages: 3 });

    const req = makeReq({ page: 1, limit: 10, order: 'DESC' });
    const res = makeRes();

    await controller.indexAllTenants(req, res);

    const body = res.body as any;
    expect(body.pagination.nextPage).toBe(true);
    expect(body.pagination.prevPage).toBe(false);
  });

  it('computes prevPage=true on page 2', async () => {
    const { controller, service } = makeController();

    service.indexAllTenants.mockResolvedValue({ records: [], totalRecords: 30, totalPages: 3 });

    const req = makeReq({ page: 2, limit: 10, order: 'DESC' });
    const res = makeRes();

    await controller.indexAllTenants(req, res);

    const body = res.body as any;
    expect(body.pagination.prevPage).toBe(true);
    expect(body.pagination.nextPage).toBe(true);
  });

  it('returns 422 when service throws an UnprocessableEntityError', async () => {
    const { controller, service } = makeController();

    const { UnprocessableEntityError } = await import('../../../errors');
    service.indexAllTenants.mockRejectedValue(new UnprocessableEntityError('DB unavailable'));

    const req = makeReq({ page: 1, limit: 10, order: 'DESC' });
    const res = makeRes();

    await controller.indexAllTenants(req, res);

    expect(res.statusCode).toBe(422);
    expect((res.body as any).status).toBe('error');
  });

  it('returns 422 for unexpected errors', async () => {
    const { controller, service } = makeController();

    service.indexAllTenants.mockRejectedValue(new Error('Network timeout'));

    const req = makeReq({ page: 1, limit: 10, order: 'DESC' });
    const res = makeRes();

    await controller.indexAllTenants(req, res);

    expect(res.statusCode).toBe(422);
    expect((res.body as any).status).toBe('error');
  });
});
