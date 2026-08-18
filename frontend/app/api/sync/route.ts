import { NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const headerSecret = request.headers.get("x-cron-secret");
  return headerSecret === secret;
}

function getBackendBase(): string {
  return process.env.B28_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${getBackendBase()}/api/v1/admin/catalog/internal/sync-youtube`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": process.env.CRON_SECRET ?? "",
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      const message = json.error?.message ?? "Sync failed";
      return NextResponse.json({ ok: false, error: message }, { status: res.status || 500 });
    }

    return NextResponse.json({
      ok: true,
      count: json.data.count,
      syncedAt: json.data.syncedAt,
      message: "Catalog synced to Postgres via backend",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
