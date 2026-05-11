import { Request, Response } from 'express';
import { FindOptionsWhere, EntityTarget, Repository, FindOperator, Brackets } from 'typeorm';
import { CustomError, NotFoundError, UnprocessableEntityError } from '../errors';
import { TenantDbManager } from '../tenants/datasource';
import { getTenantRepository } from '../utils/tenant/tenant.utils';
import responseMessages from './base.messages';
import logger from '../infrastructure/logger';

export abstract class BaseController {
  protected readonly entity: EntityTarget<any>;
  protected readonly tenantDbManager: TenantDbManager;
  protected readonly responseMessages: any;

  constructor(entity: EntityTarget<any>) {
    this.entity = entity;
    this.tenantDbManager = TenantDbManager.getInstance();
    this.responseMessages = responseMessages;
  }

  protected async getRepository(req: Request): Promise<Repository<any>> {
    return getTenantRepository(req, this.entity);
  }
  protected async getRepositoryByDomain(domain: string): Promise<Repository<any>> {
    const conn = await this.tenantDbManager.getConnectionByDomain(domain);
    return conn.getRepository(this.entity);
  }

  /**
   * Override in child controllers to restrict which fields are returned in index and show.
   * Return null (default) for full records.
   *
   * @example
   * protected getSelectableFields(): string[] | null {
   *   return ['id', 'name', 'status', 'createdAt'];
   * }
   */
  protected getSelectableFields(): string[] | null {
    return null;
  }

  /**
   * Fetch all records for the model with pagination and filtering.
   */
  public async index(req: Request, res: Response): Promise<void> {
    try {
      await this.beforeAll(req);
      const repository = await this.getRepository(req);
      const getAll = req.body?.getAll === true || req.body?.getAll === 'true';
      const pageRaw = req.body?.page;
      const page = getAll ? 0 : pageRaw === 0 || pageRaw === '0' ? 0 : parseInt(req.body?.page as string) || 1;
      const limitRaw = req.body?.limit;
      const limit = page === 0 ? 999999 : parseInt(limitRaw as string) || 10;
      const skip = page === 0 ? 0 : (page - 1) * limit;
      const relations = this.getRelations(req);
      const order = this.applyDefaultOrder(this.getOrderBy(req), this.defaultOrderBy());
      const whereConditions = await this.getWhereConditions(req);
      const query = await this.formatFilterConditions(req.body?.filterConditions, req);
      const hasSearch = query?.search && this.getSearchableFields().length > 0;
      const selectableFields = this.getSelectableFields();

      let records: any[];
      let totalRecords: number;

      if (hasSearch) {
        const queryBuilder = this.buildQueryBuilder(repository, relations, {}, order);

        const filters: Record<string, any> = {};
        Object.keys(query).forEach((key) => {
          if (key !== 'search') filters[key] = query[key];
        });
        this.addWhereConditions(queryBuilder, filters);

        const searchableFields = this.getSearchableFields();
        if (searchableFields.length > 0) {
          queryBuilder.andWhere(`(${searchableFields.map((field) => `entity.${field} ILIKE :search`).join(' OR ')})`, { search: `%${query.search}%` });
        }

        if (selectableFields?.length) {
          queryBuilder.select(selectableFields.map((f) => `entity.${f}`));
        }

        totalRecords = await queryBuilder.getCount();
        queryBuilder.skip(skip).take(limit);
        records = await queryBuilder.getMany();
      } else if (this.needsCustomOrdering()) {
        const queryBuilder = this.buildQueryBuilder(repository, relations, whereConditions, order);

        if (selectableFields?.length) {
          queryBuilder.select(selectableFields.map((f) => `entity.${f}`));
        }

        totalRecords = await queryBuilder.getCount();
        queryBuilder.skip(skip).take(limit);
        records = await queryBuilder.getMany();
      } else if (selectableFields?.length) {
        const queryBuilder = this.buildQueryBuilder(repository, relations, whereConditions, order);
        queryBuilder.select(selectableFields.map((f) => `entity.${f}`));

        [records, totalRecords] = await queryBuilder.skip(skip).take(limit).getManyAndCount();
      } else {
        [records, totalRecords] = await repository.findAndCount({
          where: whereConditions,
          relations,
          skip,
          take: limit,
          order,
        });
      }

      const totalPages = Math.ceil(totalRecords / limit);
      const isNextPage = page + 1 <= totalPages;
      const isPrevPage = page - 1 > 0;

      res.status(200).json({
        status: 'success',
        pagination: { page, limit, totalRecords, totalPages: Math.ceil(totalRecords / limit), nextPage: isNextPage, prevPage: isPrevPage },
        data: records,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Fetch a single record by ID for the model.
   */
  public async show(req: Request, res: Response): Promise<void> {
    const id = req.params.id || '';
    try {
      await this.beforeAll(req);
      const repository = await this.getRepository(req);
      const relations = this.getRelations(req);
      const selectableFields = this.getSelectableFields();

      let record: any;

      if (this.needsCustomOrdering()) {
        const order = this.applyDefaultOrder(this.getOrderBy(req), this.defaultOrderBy());
        const queryBuilder = this.buildQueryBuilder(repository, relations, { id } as FindOptionsWhere<any>, order);
        if (selectableFields?.length) {
          queryBuilder.select(selectableFields.map((f) => `entity.${f}`));
        }
        record = await queryBuilder.getOne();
      } else {
        record = await repository.findOne({
          where: { id } as FindOptionsWhere<any>,
          relations,
        });
      }

      if (!record) {
        throw new NotFoundError(this.responseMessages.NOT_FOUND(repository.metadata.name, id));
      }

      res.status(200).json({ status: 'success', data: record });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create a new record for the model.
   */
  public async create(req: Request, res: Response): Promise<void> {
    try {
      await this.beforeAll(req);
      await this.beforeSave(req.body, 'create', req);
      const repository = await this.getRepository(req);
      const data = req.validatedData || req.body;
      const transformData = await this.transformData(data, 'create', req);
      const relations = this.getRelations(req);

      const record = repository.create(transformData);
      const savedRecord = await repository.save(record);

      await this.afterCreate(savedRecord, req);

      const recordWithRelations =
        relations && relations.length > 0
          ? await repository.findOne({
              where: { id: savedRecord.id } as FindOptionsWhere<any>,
              relations,
            })
          : savedRecord;

      res.status(201).json({
        status: 'success',
        message: this.responseMessages.CREATED_SUCCESSFULLY(repository.metadata.name),
        data: recordWithRelations,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update a record for the model.
   */
  public async update(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    try {
      await this.beforeAll(req);
      await this.beforeSave(req.body, 'update', req);
      const repository = await this.getRepository(req);
      const data = req.validatedData || req.body;
      const transformData = await this.transformData(data, 'update', req);
      const relations = this.getRelations(req);

      const record = await repository.findOne({
        where: { id } as FindOptionsWhere<any>,
      });

      if (!record) {
        throw new NotFoundError(this.responseMessages.NOT_FOUND(repository.metadata.name, id));
      }

      Object.assign(record, transformData);
      const updatedRecord = await repository.save(record);

      await this.afterUpdate(record, req);

      const recordWithRelations =
        relations && relations.length > 0
          ? await repository.findOne({
              where: { id: updatedRecord.id } as FindOptionsWhere<any>,
              relations,
            })
          : updatedRecord;

      res.status(200).json({
        status: 'success',
        message: this.responseMessages.UPDATED_SUCCESSFULLY(repository.metadata.name),
        data: recordWithRelations,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete a record for the model.
   */
  public async destroy(req: Request, res: Response): Promise<void> {
    const id = req.params.id;
    try {
      await this.beforeAll(req);
      const repository = await this.getRepository(req);
      const record = await repository.findOne({
        where: { id } as FindOptionsWhere<any>,
      });

      if (!record) {
        throw new NotFoundError(this.responseMessages.NOT_FOUND(repository.metadata.name, id));
      }

      await repository.remove(record);

      res.status(204).send();
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handle errors gracefully.
   */
  protected handleError(error: any, res: Response): void {
    if (error instanceof CustomError) {
      res.status(error.statusCode).json(error.json());
    } else {
      logger.error({ err: error }, 'Unhandled controller error');
      const internalError = new UnprocessableEntityError(error.message ?? 'Unexpected error');
      res.status(internalError.statusCode).json(internalError.json());
    }
  }

  protected formatFilterConditions(filterConditions: Record<string, any>, req: Request): Record<string, any> | Promise<Record<string, any>> {
    void req;
    return filterConditions;
  }

  protected async getWhereConditions(req: Request): Promise<FindOptionsWhere<any>> {
    const filters: Record<string, any> = {};
    const query = await this.formatFilterConditions(req.body?.filterConditions, req);
    if (!query) return filters;

    Object.keys(query).forEach((key) => {
      if (!['search', 'sortBy', 'orderBy', 'order'].includes(key)) {
        filters[key] = query[key];
      }
    });

    return filters;
  }

  /**
   * Override this in child controllers to define searchable fields.
   */
  protected getSearchableFields(): string[] {
    return [];
  }

  /**
   * Extract relations from request body or use default.
   */
  protected getRelations(req: Request): string[] {
    const include = req.body?.include;
    if (include && typeof include === 'object') {
      return Object.keys(include).filter((key) => include[key] === true);
    }
    const defaultRelations = this.getInclude();
    return defaultRelations ? Object.keys(defaultRelations).filter((key) => defaultRelations[key] === true) : [];
  }

  /**
   * Override this in child controllers to define default relations.
   */
  protected getInclude(): Record<string, boolean> | null {
    return null;
  }

  /**
   * Transform data before sending the response.
   * Override in child controllers to inject extra fields.
   */
  protected transformData(data: any, method?: string, req?: Request): any {
    void method;
    void req;
    return data;
  }

  /**
   * Appends default order keys to user order without overwriting. User keys stay first so their sort takes effect; default keys are added only as tiebreakers.
   */
  protected applyDefaultOrder(userOrder: Record<string, 'ASC' | 'DESC'>, defaultOrder: Record<string, 'ASC' | 'DESC'>): Record<string, 'ASC' | 'DESC'> {
    const merged = { ...userOrder };
    for (const key of Object.keys(defaultOrder)) {
      if (!(key in merged)) merged[key] = defaultOrder[key];
    }
    return merged;
  }

  /**
   * Returns only the order from the request (body or query). Does not include default order; that is applied in index/show.
   */
  protected getOrderBy(req: Request): Record<string, 'ASC' | 'DESC'> {
    const filterConditions = req.body?.filterConditions ?? req.query;
    const orderBy = filterConditions?.orderBy;
    const order = this.getOrder(req);
    const sortKeys = filterConditions?.sortKeys;

    if (sortKeys && Array.isArray(sortKeys) && sortKeys.length > 0) {
      this.validateOrderByKeys(sortKeys);
      const result: Record<string, 'ASC' | 'DESC'> = {};
      sortKeys.forEach((key: string) => {
        result[key] = 'ASC';
      });
      return result;
    }

    if (orderBy && typeof orderBy === 'object' && !Array.isArray(orderBy)) {
      this.validateOrderByKeys(Object.keys(orderBy));
      const result: Record<string, 'ASC' | 'DESC'> = {};
      Object.keys(orderBy).forEach((key) => {
        const dir = String(orderBy[key] ?? 'asc').toLowerCase();
        result[key] = dir === 'desc' ? 'DESC' : 'ASC';
      });
      return result;
    }

    if (Array.isArray(orderBy) && orderBy.length > 0) {
      this.validateOrderByKeys(orderBy);
      const direction = order === 'desc' ? 'DESC' : 'ASC';
      const result: Record<string, 'ASC' | 'DESC'> = {};
      orderBy.forEach((key: string) => {
        result[key] = direction;
      });
      return result;
    }

    if (typeof orderBy === 'string' && order) {
      this.validateOrderByKeys([orderBy]);
      return { [orderBy]: order === 'desc' ? 'DESC' : 'ASC' };
    }

    return {};
  }

  protected getOrder(req: Request): 'asc' | 'desc' | undefined {
    const order = req.body?.order ?? req.query?.order;

    if (order && order !== 'asc' && order !== 'desc') {
      throw new UnprocessableEntityError(`Invalid order value '${order}'. Allowed values are: 'asc', 'desc'`);
    }

    return order === 'asc' || order === 'desc' ? order : undefined;
  }

  /**
   * Validate that orderBy keys exist in the model schema.
   * Throws UnprocessableEntityError if any key doesn't exist.
   */
  protected validateOrderByKeys(keys: string[]): void {
    const validFields = this.getValidOrderByFields();

    for (const key of keys) {
      if (!validFields.includes(key)) {
        throw new UnprocessableEntityError(`Invalid orderBy key '${key}'. Valid keys are: ${validFields.join(', ')}`);
      }
    }
  }

  /**
   * Get valid fields that can be used for ordering.
   * Override in child controllers to customize valid fields.
   */
  protected getValidOrderByFields(): string[] {
    return ['id', 'createdAt', 'updatedAt'];
  }

  /**
   * Add custom ordering to query builder with support for CASE expressions and custom sort orders.
   */
  protected addCustomOrdering(queryBuilder: any, order: Record<string, 'ASC' | 'DESC'>): void {
    const customSortOrders = this.getCustomSortOrders();

    Object.keys(order).forEach((key) => {
      if (customSortOrders[key]) {
        const caseExpression = this.buildCaseExpression(key, customSortOrders[key]);
        queryBuilder.addOrderBy(caseExpression, order[key]);
      } else {
        queryBuilder.addOrderBy(`entity.${key}`, order[key]);
      }
    });
  }

  /**
   * Build CASE expression for custom sort orders.
   */
  protected buildCaseExpression(field: string, sortOrder: string[]): string {
    const cases = sortOrder.map((value, index) => `WHEN '${value}' THEN ${index + 1}`).join(' ');
    return `CASE entity.${field} ${cases} ELSE ${sortOrder.length + 1} END`;
  }

  protected getCustomSortOrders(): Record<string, string[]> {
    return {};
  }

  /**
   * Determine if custom ordering is needed. Override in child controllers that need query builder for ordering.
   */
  protected needsCustomOrdering(): boolean {
    const customSortOrders = this.getCustomSortOrders();
    return Object.keys(customSortOrders).length > 0;
  }

  protected defaultOrderBy(): Record<string, 'ASC' | 'DESC'> {
    return { createdAt: 'DESC' };
  }

  protected async afterCreate(data: any, req: Request): Promise<void> {
    void data;
    void req;
  }

  protected async beforeAll(req: Request): Promise<void> {
    void req;
  }

  protected async beforeSave(data: any, method: string, req: Request): Promise<void> {
    void data;
    void method;
    void req;
  }

  protected async afterUpdate(data: any, req: Request): Promise<void> {
    void data;
    void req;
  }

  /**
   * Build a query builder with relations, where conditions, and ordering.
   */
  protected buildQueryBuilder(repository: any, relations: string[], whereConditions: Record<string, any>, order: Record<string, 'ASC' | 'DESC'>): any {
    const queryBuilder = repository.createQueryBuilder('entity');

    this.addRelationsToQueryBuilder(queryBuilder, relations);

    this.addWhereConditions(queryBuilder, whereConditions);

    this.addCustomOrdering(queryBuilder, order);

    return queryBuilder;
  }

  /**
   * Add relations to query builder with support for nested paths.
   */
  protected addRelationsToQueryBuilder(queryBuilder: any, relations: string[]): void {
    const aliasJoined = new Set<string>();
    relations.forEach((relation) => {
      const parts = relation.split('.');
      let parentAlias = 'entity';
      let accumulatedAlias = '';
      for (const part of parts) {
        accumulatedAlias = accumulatedAlias ? `${accumulatedAlias}_${part}` : part;
        const joinPath = `${parentAlias}.${part}`;
        const safeAlias = accumulatedAlias;
        if (!aliasJoined.has(safeAlias)) {
          queryBuilder.leftJoinAndSelect(joinPath, safeAlias);
          aliasJoined.add(safeAlias);
        }
        parentAlias = safeAlias;
      }
    });
  }

  /**
   * Add where conditions to query builder.
   */
  protected addWhereConditions(queryBuilder: any, whereConditions: Record<string, any>): void {
    Object.entries(whereConditions).forEach(([key, value]) => {
      if (value === null || (Array.isArray(value) && value.every((v) => v == null))) {
        queryBuilder.andWhere(`entity.${key} IS NULL`);
        return;
      }

      if (value instanceof FindOperator) {
        if (value.type === 'in') {
          queryBuilder.andWhere(`entity.${key} IN (:...${key})`, { [key]: value.value });
          return;
        }
        if (value.type === 'isNull') {
          queryBuilder.andWhere(`entity.${key} IS NULL`);
          return;
        }
      }

      if (value && typeof value === 'object' && '__inOrNull' in value && Array.isArray((value as { __inOrNull: unknown[] }).__inOrNull)) {
        const values = (value as { __inOrNull: unknown[] }).__inOrNull;
        queryBuilder.andWhere(
          new Brackets((qb) => {
            qb.where(`entity.${key} IN (:...${key})`, { [key]: values }).orWhere(`entity.${key} IS NULL`);
          })
        );
        return;
      }

      if (Array.isArray(value)) {
        const nonNullValues = value.filter((v) => v != null);
        const hasNull = value.some((v) => v == null);
        if (nonNullValues.length > 0 && hasNull) {
          queryBuilder.andWhere(
            new Brackets((qb) => {
              qb.where(`entity.${key} IN (:...${key})`, { [key]: nonNullValues }).orWhere(`entity.${key} IS NULL`);
            })
          );
        } else if (nonNullValues.length > 0) {
          queryBuilder.andWhere(`entity.${key} IN (:...${key})`, { [key]: nonNullValues });
        }
        return;
      }

      queryBuilder.andWhere(`entity.${key} = :${key}`, { [key]: value });
    });
  }
}
