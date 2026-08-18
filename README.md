# B28 Oncodex Monorepo

| App | Folder | URL |
|---|---|---|
| Streaming site | `frontend/` | http://localhost:3000 |
| Admin dashboard | `backend/dashboard/` | http://localhost:3001 |
| REST API | `backend/` | http://localhost:4000 |

## Quick start

```powershell
cd A:\b28
npm install
npm run db:up:docker
npm run db:migrate
npm run db:seed
npm run dev:all
```

Install app dependencies first if needed:

```powershell
npm install --prefix frontend
npm install --prefix backend
npm install --prefix backend/dashboard
```

## Environment files

- `frontend/.env.local` — copy from `frontend/.env.example`
- `backend/.env` — copy from `backend/.env.example`
- `backend/dashboard/.env.local` — copy from `backend/dashboard/.env.example`

## Admin dashboard login

- URL: http://localhost:3001/login
- Seed: `admin@b28.dev` / `Password123!`

## Catalog sync (backend → frontend)

The streaming site loads its film catalog from the API (`GET /api/v1/catalog`). Edit titles, genres, and visibility in the admin dashboard under **Films** — changes appear on http://localhost:3000 within about 30 seconds.

## Streamer / Filmmaker login

- **Log in:** http://localhost:3000/login (email, phone OTP, or Google)
- **Plans:** http://localhost:3000/offers (after login — monthly/annual premium or free with ads)
- **Payment methods:** M-Pesa, PayPal, or card (linked on offers page; stored in backend)
- **Test accounts:** `streamer.free@b28.dev` / `streamer.premium@b28.dev` / `filmmaker@b28.dev` — password `Password123!`

Watch progress, watch-later list, and subscription status sync to the backend when logged in.

## Docs

- [DEPLOY.md](DEPLOY.md) — Vercel (frontend root: `frontend/`)
- [backend/README.md](backend/README.md) — API
- [backend/dashboard/README.md](backend/dashboard/README.md) — Admin UI
