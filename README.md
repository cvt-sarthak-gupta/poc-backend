# pip-backend — Multi-Tenant Orders Aggregation

Production-quality Node.js/TypeScript backend for a multi-tenant Orders Aggregation POC.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 5 |
| Language | TypeScript 5 (strict) |
| ORM | TypeORM 0.3 |
| Database | PostgreSQL 16 |
| Validation | Zod |
| Logging | Pino |
| Testing | Jest + ts-jest |

## Architecture

### Multi-Tenancy Model

Each tenant has its own isolated PostgreSQL database. The admin database stores tenant registry metadata (including each tenant's `dbUrl`). `TenantDbManager` lazily creates and caches a `DataSource` per tenant on first request.

```
Request → AuthMiddleware
             ├─ verifies JWT → extracts tenantId + userId
             ├─ looks up tenant in admin DB (is active?)
             └─ establishes tenant DB connection → loads User
```

`req.tenantId` is available to all downstream middleware and controllers.

### Cross-Tenant Aggregation (Week 2+)

`AggregationService` fans out to all tenant DBs in parallel, merges the results in memory, applies global sort, and paginates — without ever mixing data at the database level.

```
GET /api/v1/aggregation/orders
  → AggregationService.aggregateOrders([t1, t2, t3], options)
      ├─ fetchFromTenant(t1, options)   ─┐
      ├─ fetchFromTenant(t2, options)   ─┼─ Promise.all (parallel fan-out)
      └─ fetchFromTenant(t3, options)   ─┘
      → merge + sort in-memory
      → slice page/limit
      → return { data, total, page, limit, totalPages }
```

### Folder Structure

```
src/
├── config/              # Typed env-var access (single source of truth)
├── common/              # Base classes (extend, never modify)
│   ├── base.controller.ts
│   ├── base.routes.ts
│   ├── base.auth.ts
│   ├── base.validator.ts
│   └── base.services.ts
├── errors/              # CustomError hierarchy
├── infrastructure/
│   └── database/
│       ├── admin.datasource.ts     # Admin DB (tenant registry)
│       └── tenant-db.manager.ts   # Lazy per-tenant DataSource pool
├── admin/
│   ├── entities/
│   │   └── tenant.entity.ts
│   └── migrations/
├── tenants/
│   ├── datasource.ts              # Re-exports TenantDbManager
│   ├── entities/                  # Shared entities (User, Role, Task…)
│   ├── middlewares/
│   │   └── auth.middleware.ts
│   ├── migrations/
│   └── orders/                    # Order feature module + cross-tenant aggregation
├── types/
│   └── express.d.ts               # req.tenantId augmentation
└── utils/
    ├── logger.ts
    └── tenant/
        └── tenant.utils.ts        # getTenantRepository helper
```

### Feature Module Pattern (8 files)

Each feature follows the same structure:

```
<feature>/
  <feature>.entity.ts      # TypeORM entity
  <feature>.dto.ts         # CreateDto, UpdateDto interfaces
  <feature>.repository.ts  # Feature-specific queries only
  <feature>.controller.ts  # Extends BaseController (CRUD free)
  <feature>.routes.ts      # Extends BaseApiRoutes
  <feature>.validator.ts   # Extends BaseValidator (Zod schemas)
  <feature>.auth.ts        # Extends BaseAuthMiddleware (RBAC)
  <feature>.service.ts     # Business logic beyond CRUD
  index.ts                 # Barrel export
```

## Setup

### Prerequisites

- Node.js 20+
- Docker + Docker Compose

### 1 — Start dependencies

```bash
docker compose up -d
```

### 2 — Configure environment

```bash
cp .env.example .env
# Edit .env as needed
```

### 3 — Install dependencies

```bash
npm install
```

### 4 — Run admin migrations

```bash
npm run migration:run:admin
```

### 5 — Start dev server

```bash
npm run dev
```

Server starts on `http://localhost:3000`. Health check: `GET /health`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm test` | Run Jest test suite |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run migration:run:admin` | Run admin DB migrations |
| `npm run migration:run:tenant` | Run tenant DB migrations |
| `npm run migration:generate:admin` | Generate new admin migration |
| `npm run migration:generate:tenant` | Generate new tenant migration |
| `npm run seed` | Seed 150 random orders into every active tenant DB |

## Seeding

The seed script connects to the admin DB, fetches all active tenants, and inserts 150 randomly generated orders (varying status, amount, currency, and timestamps spread over the past 2 years) into each tenant's database.

```bash
npm run seed
```

Requires active tenants with a valid `dbUrl` in the admin DB. Safe to re-run — it truncates before inserting.

## API Routes

### Health

```
GET /health
```

### Tenants

```
POST /api/v1/admin/tenants/all   # Paginated tenant list
```

### Orders — cross-tenant aggregation

```
POST /api/v1/orders/admin/all    # Fan-out across all (or selected) tenant DBs
```

Request body:

```json
{
  "page": 1,
  "limit": 20,
  "order": { "field": "createdAt", "direction": "DESC" },
  "tenantIds": [1, 2],
  "status": "pending",
  "currency": "USD",
  "search": ""
}
```

### Orders — single tenant

```
POST /api/v1/orders/all          # Requires tenant context (resolved from JWT)
```

## Environment Variables

| Variable | Default | Required |
|---|---|---|
| `NODE_ENV` | `development` | No |
| `PORT` | `3000` | No |
| `ADMIN_DB_HOST` | `localhost` | Yes (prod) |
| `ADMIN_DB_PORT` | `5432` | No |
| `ADMIN_DB_USER` | `postgres` | Yes (prod) |
| `ADMIN_DB_PASSWORD` | `postgres` | Yes (prod) |
| `ADMIN_DB_NAME` | `pip_admin` | No |
| `JWT_SECRET` | — | Yes |
| `JWT_EXPIRES_IN` | `7d` | No |

## POC Roadmap

| Week | Deliverable |
|---|---|
| 1 | Architecture foundation (this PR) |
| 2 | Order CRUD APIs + AggregationService implementation |
| 3 | Global filtering, sorting, pagination |
| 4 | Unit tests, documentation, frontend integration |
