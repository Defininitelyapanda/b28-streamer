# B28 Oncodex API

Production backend for the B28 Oncodex streaming platform.

## Stack

- NestJS 11 + TypeScript (strict)
- PostgreSQL 16 + Prisma ORM
- Redis 7 (optional cache + health checks)
- Argon2id password hashing
- JWT access + refresh token rotation
- OpenAPI/Swagger documentation

## Prerequisites

- Node.js 18+
- PostgreSQL (local install or Docker)

## Quick start

From repository root:

```powershell
$env:POSTGRES_PASSWORD = "your-postgres-superuser-password"
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev:api
```

Or from `backend/`:

```powershell
cd backend
copy .env.example .env
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

API: http://localhost:4000  
Swagger: http://localhost:4000/api/docs  
Health: http://localhost:4000/health/ready

## Seed users

All seed users use password: `Password123!`

| Email | Role |
|---|---|
| superadmin@b28.dev | SUPER_ADMIN |
| admin@b28.dev | ADMIN |
| moderator@b28.dev | MODERATOR |
| finance@b28.dev | FINANCE_ADMIN |
| filmmaker@b28.dev | FILMMAKER + STREAMER |
| streamer.free@b28.dev | STREAMER |
| streamer.premium@b28.dev | STREAMER |

## API response format

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Human-readable message" } }
```

## Key endpoints

### Public (no JWT)

- `GET /api/v1/catalog` — paginated catalog list (cached 60s)
- `GET /api/v1/catalog/videos/:slug` — video metadata
- `GET /api/v1/catalog/videos/:slug/related` — related videos
- `GET /api/v1/subscriptions/offers` — subscription pricing
- `GET /api/v1/feature-flags` — enabled feature flags
- `POST /api/v1/auth/register|login|refresh|logout`

### Authenticated

- `GET /api/v1/users/me`
- `GET /api/v1/streaming/play/:slug` — playback URL (subscription required)
- `POST /api/v1/subscriptions/subscribe` — requires `PREMIUM` flag **and** `payments.gateway_enabled`

### Admin

- `GET /api/v1/admin/users` (requires `users.read`)
- `GET|PUT /api/v1/admin/settings` (requires `settings.read|write`)
- `GET /api/v1/admin/audit-logs` (requires `audit.read`)
- `PUT /api/v1/admin/catalog` — upsert catalog videos

## Caching

When `REDIS_URL` is set, catalog and subscription checks use Redis. Otherwise an in-process memory cache is used (per container).

| Key pattern | TTL | Invalidated on |
|---|---|---|
| `catalog:list:*` | 60s | catalog upsert/sync/update |
| `catalog:slug:*` | 120s | catalog upsert/sync/update |
| `catalog:related:*` | 120s | catalog upsert/sync/update |
| `canStream:{userId}` | 30s | subscribe upsert |

Public catalog GET responses include `Cache-Control: public, s-maxage=60, stale-while-revalidate=300`.

## Environment variables

See [`.env.example`](.env.example).

Important production rules:

- `DEV_BYPASS_STREAMING=true` **refuses to start** when `NODE_ENV=production`
- `payments.gateway_enabled` defaults to `false` in seed — keep disabled until real payments (Phase C)
- `PREMIUM` feature flag defaults to `false` — subscribe requires both flags
- Production `DATABASE_URL` should use Neon/Vercel pooled connection (`?pgbouncer=true`)

## Database commands

```bash
npm run prisma:migrate      # apply migrations (dev)
npm run prisma:migrate:deploy  # apply migrations (prod)
npm run prisma:seed         # seed roles, users, settings
npm run prisma:reset        # reset DB and re-seed
```

## Testing

```bash
npm test           # unit tests
npm run test:e2e   # integration tests (requires DB)
```

With a configured database:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:REQUIRE_TEST_DB="true"
npm test
npm run test:e2e
```

Or use `scripts/test-db.ps1`.

CI runs on every push/PR to `main` via `.github/workflows/backend-ci.yml`.

## Architecture

Modular monolith under `src/`:

- `auth/` — registration, login, sessions, Google/phone auth
- `catalog/` — public catalog metadata, admin CRUD, YouTube sync
- `streaming/` — playback URLs with subscription guard
- `subscriptions/` — offers, subscribe, payment methods
- `filmmakers/` — filmmaker applications
- `users/` — profile and admin user management
- `roles/` — RBAC roles and permissions
- `settings/` — platform settings and feature flags
- `audit/` — append-only audit log
- `health/` — liveness and readiness probes
- `common/cache/` — Redis + memory cache layer
- `common/` — guards, filters, crypto, email abstraction

## Business settings (seeded defaults)

- Monthly subscription: KES 400
- Annual subscription: KES 4,320 (10% discount)
- Revenue split: 70% filmmaker / 30% platform
- `payments.gateway_enabled`: `false`
- Qualified stream: 30 seconds or 20% watched

All values are stored in `platform_settings` and editable via admin API.
