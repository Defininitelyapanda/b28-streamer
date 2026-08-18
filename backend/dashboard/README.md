# B28 Oncodex Admin Dashboard

Next.js admin UI for the B28 Oncodex platform (nested inside `backend/`).

## Run

```powershell
cd backend/dashboard
copy .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3001

Or from repo root: `npm run dev:dashboard`

## Login (seed users)

Password for all: `Password123!`

| Email | Access |
|---|---|
| superadmin@b28.dev | Full access |
| admin@b28.dev | Users, settings, audit |
| moderator@b28.dev | Moderation, users read |
| finance@b28.dev | Payments, revenue, payouts (placeholders) |

Requires the API running on http://localhost:4000 with CORS allowing http://localhost:3001.

## Live pages (Phase 1)

- Overview, Users, Settings, Audit Logs, System Health

Other sidebar sections show placeholders until backend Phases 2–8 are implemented.
