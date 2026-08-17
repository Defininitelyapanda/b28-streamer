# B28 Entertainment Streaming Platform

Netflix-style streaming front-end for **B28 Entertainment** Kenyan films, powered by YouTube embeds and automatic channel sync.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **YouTube Data API v3** for channel catalog sync
- **Vercel** for hosting and Cron Jobs

## Local development

### Prerequisites

- [Node.js 18+](https://nodejs.org/) and npm

### Setup

```bash
cd a:\b28
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```env
YOUTUBE_API_KEY=your_google_cloud_api_key
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxx
CRON_SECRET=your_random_secret_string
```

### Run dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

The site works immediately with the seeded catalog in `data/catalog.json` (11 B28 titles).

### Sync catalog from YouTube (local)

```bash
npm run sync
```

This fetches all uploads from your YouTube channel and writes `data/catalog.json`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Add environment variables in **Project Settings → Environment Variables**:
   - `YOUTUBE_API_KEY`
   - `YOUTUBE_CHANNEL_ID`
   - `CRON_SECRET`
4. Deploy.

Vercel Cron (configured in `vercel.json`) calls `/api/sync` every 6 hours.

### First sync on Vercel

After deploy, trigger a manual sync:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-app.vercel.app/api/sync
```

**Note:** Vercel serverless functions have a read-only filesystem. Runtime sync updates an in-memory cache for that instance. For persistent catalog updates on Vercel, run `npm run sync` locally and commit the updated `data/catalog.json`, or upgrade to Vercel KV later.

## Routes

| Route | Description |
|---|---|
| `/` | Home — hero, continue watching, my list, genre rows |
| `/browse` | Filter by genre, decade, film/trailer |
| `/search?q=` | Search titles |
| `/watch/[videoId]` | Full watch page with YouTube player |
| `/api/catalog` | JSON catalog API |
| `/api/sync` | YouTube channel sync (Cron-protected) |

## YouTube API setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project → enable **YouTube Data API v3**.
3. Create an **API key** under Credentials.
4. Find your channel ID: YouTube Studio → Settings → Channel → Advanced settings, or from your channel URL.

## User features (browser localStorage)

- **My List** — save titles from hero or watch page
- **Continue Watching** — resume progress (saved every 5 seconds while playing)
- **Watch History** — last 50 played titles

## Project structure

```
app/           Next.js pages and API routes
components/    UI components (hero, cards, player, browse)
lib/           Catalog, YouTube sync, classification, watch history
data/          catalog.json (seed + sync output)
config/        Manual genre/series overrides
scripts/       Local sync script
b28 v2.html    Original prototype (reference only)
```

## Original prototype

The single-file prototype [`b28 v2.html`](b28%20v2.html) is kept for reference. The Next.js app replaces it for production deployment.
