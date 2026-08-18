import "server-only";

import { SEED_CATALOG } from "@/lib/seed-catalog";
import type { CatalogData, CatalogVideo } from "@/lib/types";

declare global {
  // eslint-disable-next-line no-var
  var __b28CatalogCache: CatalogData | undefined;
}

const API_BASE = process.env.B28_API_URL ?? "http://localhost:4000";
const CATALOG_REVALIDATE = Number(process.env.CATALOG_REVALIDATE_SECONDS ?? "30");

function defaultCatalog(): CatalogData {
  return {
    videos: SEED_CATALOG,
    syncedAt: null,
    source: "built-in seed",
  };
}

export function normalizeMovie(
  item: Partial<CatalogVideo> & Record<string, unknown>,
  fallbackIndex = 0
): CatalogVideo {
  const id = String(item.id || item.slug || item.videoId || `movie-${fallbackIndex}`);
  const title = String(item.title || item.name || "Untitled movie");
  const genre = String(item.genre || item.category || "Drama");
  const desc = String(
    item.desc || item.description || item.summary || "No description available."
  );
  const date = String(item.date || item.year || item.release_date || "2026").slice(0, 10);
  const rating = String(item.rating || item.score || (Math.random() * 2 + 7).toFixed(1));
  const videoId = String(item.videoId || item.youtubeId || item.source_id || item.embedId || id);
  const thumbnail =
    String(item.thumbnail || item.poster || item.image || item.cover) ||
    `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const sourceType = String(item.sourceType || item.source || item.provider || "youtube");
  const type = (item.type as CatalogVideo["type"]) || "film";
  const seriesGroup = String(item.seriesGroup || title.split("|")[0].trim());

  return {
    id,
    title,
    genre,
    desc,
    date,
    rating,
    thumbnail,
    sourceType,
    videoId,
    type,
    seriesGroup,
  };
}

async function fetchCatalogFromApi(): Promise<CatalogData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalog`, {
      next: { revalidate: CATALOG_REVALIDATE },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean; data?: CatalogData };
    if (json.success && json.data?.videos?.length) {
      return json.data;
    }
    if (!json.success && (json as CatalogData).videos?.length) {
      return json as CatalogData;
    }
  } catch {
    return null;
  }
  return null;
}

async function loadLocalCatalog(): Promise<CatalogData | null> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "catalog.json");
    const raw = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as CatalogData;
    if (data.videos?.length) return data;
  } catch {
    // fall through
  }
  return null;
}

export async function getCatalog(): Promise<CatalogData> {
  if (globalThis.__b28CatalogCache && process.env.NODE_ENV === "production") {
    return globalThis.__b28CatalogCache;
  }

  const fromApi = await fetchCatalogFromApi();
  if (fromApi) {
    globalThis.__b28CatalogCache = fromApi;
    return fromApi;
  }

  const local = await loadLocalCatalog();
  if (local) {
    globalThis.__b28CatalogCache = local;
    return local;
  }

  return defaultCatalog();
}

export async function saveCatalog(catalog: CatalogData): Promise<void> {
  globalThis.__b28CatalogCache = catalog;

  if (process.env.VERCEL === "1") {
    return;
  }

  const fs = await import("fs/promises");
  const path = await import("path");
  const filePath = path.join(process.cwd(), "data", "catalog.json");
  await fs.writeFile(filePath, JSON.stringify(catalog, null, 2), "utf-8");
}
