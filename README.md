# B28 Oncodex Monorepo

| App | Folder | URL |
|---|---|---|
| Streaming site | `frontend/` | http://localhost:3000 |
| Admin dashboard | `backend/dashboard/` | http://localhost:3001 |
| REST API | `backend/` | http://localhost:4000 |

## Quick start (one command)

```powershell
cd A:\b28
npm install          # once after clone
npm run start        # every dev session — starts Docker, DB, and all 3 apps
```

Wait for the green **"dev environment is ready"** banner, then open:

- **Streaming:** http://localhost:3000
- **Admin:** http://localhost:3001/login (`admin@b28.dev` / `Password123!`)
- **API docs:** http://localhost:4000/api/docs

### Diagnose without starting

```powershell
npm run doctor
```

### Verify all servers (after `npm run start`)

```powershell
npm run verify
```

Checks http://localhost:3000, :3001, and :4000 (health, Swagger, catalog API).

> **Important:** Type `npm run verify` and press Enter. Do not paste the green output lines back into PowerShell — that causes errors like `B28 is not recognized`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Site can't be reached on :3000 / :3001 / :4000 | Run `npm run start` from repo root and wait for the ready banner |
| Port 4000 not reachable (JSON API down) | Docker must be running; run `npm run doctor` then `npm run start` |
| Port already in use | Run `npm run stop` then `npm run start`, or just `npm run start` (auto-stops stale servers) |
| API/login broken but sites load | Start Docker Desktop, then `npm run start` |
| `db:up:docker` fails | Ensure Docker Desktop is running; scripts live in `scripts/` |
| Wrong URL | Use **http** not https — streaming `:3000`, admin `:3001`, API `:4000` |
| Pasted verification text causes PowerShell errors | Run the command `npm run verify` — do not copy/paste the output back into the terminal |

## Manual start (alternative)

```powershell
npm run db:up:docker
npm run db:migrate
npm run db:seed
npm run dev:all
```

Environment files are auto-created from `.env.example` on `npm run start`. To configure manually:

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

- [DEPLOY.md](DEPLOY.md) — Vercel Services (full stack from repo root)
- [backend/README.md](backend/README.md) — API
- [backend/dashboard/README.md](backend/dashboard/README.md) — Admin UI
