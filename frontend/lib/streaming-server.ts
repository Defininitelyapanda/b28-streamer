import "server-only";

import type { PlaybackInfo } from "@/lib/types";
import { getServerApiBase } from "@/lib/server-api-base";

interface ApiSuccess<T> {
  success: true;
  data: T;
}

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

export async function fetchPlaybackInfo(
  slug: string,
  accessToken: string,
): Promise<PlaybackInfo | null> {
  try {
    const res = await fetch(
      `${getServerApiBase()}/streaming/play/${encodeURIComponent(slug)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    const json = (await res.json()) as ApiSuccess<PlaybackInfo> | ApiError;
    if (json.success) return json.data;
    return null;
  } catch {
    return null;
  }
}
