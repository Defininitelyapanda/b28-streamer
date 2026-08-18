import { NextRequest, NextResponse } from "next/server";
import { saveCatalog } from "@/lib/catalog";
import { syncFromYouTubeChannel } from "@/lib/youtube";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const videos = await syncFromYouTubeChannel();
    const catalog = {
      videos,
      syncedAt: new Date().toISOString(),
      source: "youtube channel sync",
    };

    await saveCatalog(catalog);

    return NextResponse.json({
      ok: true,
      count: videos.length,
      syncedAt: catalog.syncedAt,
      message:
        process.env.VERCEL === "1"
          ? "Catalog synced to runtime cache. Run npm run sync locally and commit data/catalog.json for persistent updates on Vercel."
          : "Catalog synced and saved to data/catalog.json",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
