# B28 Oncodex API

Production backend for the B28 Oncodex streaming platform (Phase 1: Foundation).

## Stack

- NestJS 11 + TypeScript (strict)
- PostgreSQL 16 + Prisma ORM
- Redis 7 (health checks; queue-ready for Phase 2)
- Argon2id password hashing
- JWT access + refresh token rotation
- OpenAPI/Swagger documentation

## Prerequisites

- Node.js 18+
- Docker Desktop (for PostgreSQL and Redis)

## Quick start

**No Docker required** — uses locally installed PostgreSQL.

From repository root:

```powershell
$env:POSTGRES_PASSWORD = "your-postgres-superuser-password"
npm run db:up
npm run db:migrate
npm run db:seed
npm run dev:api
```

Or from `backend/` after `db:up`:

```powershell
cd backend
copy .env.example .env
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run start:dev
```

**With Docker** (optional):

```powershell
npm run db:up:docker
cd backend
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

## Key endpoints (Phase 1)

- `POST /api/v1/auth/register|login|refresh|logout`
- `GET /api/v1/users/me`
- `GET /api/v1/admin/users` (requires `users.read`)
- `GET|PUT /api/v1/admin/settings` (requires `settings.read|write`)
- `GET /api/v1/admin/audit-logs` (requires `audit.read`)
- `GET /api/v1/feature-flags` (public)

## Environment variables

See [`.env.example`](.env.example).

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
npm run test:e2e   # integration tests (requires DB + Redis)
```

## Architecture

Modular monolith under `src/`:

- `auth/` — registration, login, sessions, email verify, password reset
- `users/` — profile and admin user management
- `roles/` — RBAC roles and permissions
- `settings/` — platform settings and feature flags
- `audit/` — append-only audit log
- `health/` — liveness and readiness probes
- `common/` — guards, filters, crypto, email abstraction

Phase 2+ will add films, video, streaming, payments, revenue, etc. as separate modules in the same application.

## Business settings (seeded defaults)

- Monthly subscription: KES 400
- Annual subscription: KES 4,320 (10% discount)
- Revenue split: 70% filmmaker / 30% platform
- Qualified stream: 30 seconds or 20% watched

All values are stored in `platform_settings` and editable via admin API.
