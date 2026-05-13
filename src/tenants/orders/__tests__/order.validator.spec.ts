import { OrderValidator } from '../order.validator';
import { Request, Response, NextFunction } from 'express';

const validator = new OrderValidator();

const makeReq = (body: Record<string, unknown> = {}): Request =>
  ({ body, validatedData: undefined } as unknown as Request);

const makeRes = () => {
  const res = { statusCode: 200 } as unknown as Response & { statusCode: number; body: unknown };
  res.status = jest.fn((code: number) => { res.statusCode = code; return res; }) as any;
  res.json = jest.fn((data: unknown) => { res.body = data; return res; }) as any;
  return res;
};

const makeNext = () => jest.fn() as unknown as NextFunction;

describe('OrderValidator — indexAllTenants schema', () => {
  describe('valid inputs', () => {
    it('applies defaults when body is empty', async () => {
      const req = makeReq();
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedData).toMatchObject({ page: 1, limit: 10, order: 'DESC' });
    });

    it('normalises order to uppercase', async () => {
      const req = makeReq({ order: 'asc' });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedData?.order).toBe('ASC');
    });

    it('accepts valid tenantIds array', async () => {
      const req = makeReq({ tenantIds: [1, 2, 3] });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedData?.tenantIds).toEqual([1, 2, 3]);
    });

    it('accepts search string', async () => {
      const req = makeReq({ search: 'ORD-001' });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedData?.search).toBe('ORD-001');
    });

    it('trims search whitespace', async () => {
      const req = makeReq({ search: '  hello  ' });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedData?.search).toBe('hello');
    });

    it('accepts limit up to 100', async () => {
      const req = makeReq({ limit: 100 });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.validatedData?.limit).toBe(100);
    });
  });

  describe('invalid inputs', () => {
    it('rejects limit above 100', async () => {
      const req = makeReq({ limit: 101 });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(422);
    });

    it('rejects non-positive page', async () => {
      const req = makeReq({ page: 0 });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(422);
    });

    it('rejects invalid order value', async () => {
      const req = makeReq({ order: 'random' });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(422);
    });

    it('rejects unknown fields (strict mode)', async () => {
      const req = makeReq({ unknownField: true });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(422);
    });

    it('rejects non-integer tenantId values', async () => {
      const req = makeReq({ tenantIds: [1.5] });
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('indexAllTenants')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(422);
    });
  });

  describe('unknown operation', () => {
    it('returns 422 for undefined operation', async () => {
      const req = makeReq();
      const res = makeRes();
      const next = makeNext();

      await validator.middleware('nonExistentOp')(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.statusCode).toBe(422);
    });
  });
});
