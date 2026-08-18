# Deploy B28 to Vercel (5 minutes)

Your repo is ready: **https://github.com/Defininitelyapanda/b28-streamer**

Local build verified: `npm run build` passes.

## Step 1 — Import on Vercel

1. Open **https://vercel.com/new**
2. Sign in with **GitHub** (account: `Defininitelyapanda`)
3. Click **Import** next to **`b28-streamer`**
   - If missing: **Adjust GitHub App Permissions** → allow access to `b28-streamer`
4. Keep defaults:
   - Framework: **Next.js**
   - Root Directory: **`frontend`**
   - Build Command: `next build`
5. Click **Deploy** (env vars optional for first launch)

## Step 2 — Verify live site

Replace `YOUR-APP` with your Vercel URL (e.g. `b28-streamer.vercel.app`):

- https://YOUR-APP.vercel.app/
- https://YOUR-APP.vercel.app/browse
- https://YOUR-APP.vercel.app/search?q=threshold
- https://YOUR-APP.vercel.app/watch/mN1VCgEjXcg
- https://YOUR-APP.vercel.app/api/catalog

## Step 3 — Environment variables (optional)

**Project → Settings → Environment Variables**

| Key | Required for launch? |
|---|---|
| `YOUTUBE_API_KEY` | No (seeded catalog works) |
| `YOUTUBE_CHANNEL_ID` | No |
| `CRON_SECRET` | No (until YouTube sync) |

Enable **Production**, **Preview**, and **Development** for each. Then **Redeploy**.

## Step 4 — YouTube auto-sync (optional)

After env vars are set, trigger sync once:

```powershell
Invoke-WebRequest -Uri "https://YOUR-APP.vercel.app/api/sync" -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

Cron runs once daily at midnight UTC via `vercel.json` (Hobby-plan compatible).

## Deploy from CLI (alternative)

```powershell
cd A:\b28\frontend
npx vercel login
npx vercel --prod
```

## Update after changes

```powershell
git add .
git commit -m "Your change"
git push
```

Vercel redeploys automatically on push to `main`.
