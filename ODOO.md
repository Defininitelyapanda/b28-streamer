# Launch B28 on Odoo Online

Odoo Online cannot run Next.js directly. Host the app on **Vercel**, then embed it in your Odoo website with an iframe.

## Prerequisites

1. Deploy the app to Vercel (see [DEPLOY.md](DEPLOY.md))
2. Copy your live URL, e.g. `https://b28-streamer.vercel.app`

Replace `YOUR_VERCEL_URL` below with that URL (no trailing slash).

---

## Step 1 — Create the Stream page in Odoo

1. Log into **Odoo Online** → open the **Website** app
2. Click **Edit**
3. **New** → **Page**
4. Title: **Stream** (or **Watch B28**)
5. URL: `/stream`
6. Save the page shell

---

## Step 2 — Add the iframe embed

1. In the page editor, delete default content blocks if you want a clean full-screen view
2. Open **Blocks** → find **Embed Code** (under Content or Advanced)
3. Drag it onto the page
4. Click the block → **Customize** → **Edit**
5. Paste the contents of [`odoo/embed-stream.html`](odoo/embed-stream.html) after replacing `YOUR_VERCEL_URL`
6. **Save** and **Publish**

### Optional: hide Odoo header/footer on this page

In the website editor, open **Customize** and disable **Header** and **Footer** for a cinema-style full-screen experience (availability depends on your Odoo theme/plan).

---

## Step 3 — Add navigation menu

1. **Website** → **Site** → **Menu Editor** (or **Configuration → Menus**)
2. Add a new menu item:
   - **Label:** Stream
   - **URL:** `/stream`
   - **Parent:** top menu (or Home)
3. Save

### Optional external links (open in new tab)

| Label | URL |
|---|---|
| Browse | `https://YOUR_VERCEL_URL/browse` |
| Watch Threshold | `https://YOUR_VERCEL_URL/watch/mN1VCgEjXcg` |

Use **Open in new window** for external Vercel links so sharing works cleanly.

---

## Step 4 — Test checklist

After publishing, open your Odoo site at `/stream` and verify:

- [ ] Home loads inside iframe (hero + movie rows)
- [ ] Click a title → watch page plays YouTube video
- [ ] Browse and search work inside the iframe
- [ ] Mobile: test portrait mode and fullscreen on a phone

If the iframe is blank:

1. Confirm Vercel URL works directly in a browser tab
2. Redeploy Vercel after pulling latest code (includes `frame-ancestors *` in [`next.config.ts`](../next.config.ts))
3. Check browser console for CSP / X-Frame-Options errors

---

## Architecture

```
Visitor → yourcompany.odoo.com/stream → iframe → YOUR_VERCEL_URL (Next.js app)
```

YouTube sync and `/api/catalog` still run on Vercel; Odoo only displays the embedded UI.

---

## Custom domain (optional)

| Service | Domain example |
|---|---|
| Odoo website | `www.b28entertainment.com` |
| Streaming app (Vercel) | `stream.b28entertainment.com` |

Point the iframe `src` to your Vercel custom domain after configuring it in Vercel → **Settings → Domains**.
