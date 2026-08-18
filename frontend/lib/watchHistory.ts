import type { CatalogVideo, WatchProgress } from "@/lib/types";
import {
  getContinueWatching as getRemoteContinue,
  getWatchlist as getRemoteWatchlist,
  getStoredTokens,
  removeContinueWatching,
  saveWatchProgress,
  toggleWatchlistRemote,
} from "@/lib/api-client";

const WATCHLIST_KEY = "b28-watchlist";
const HISTORY_KEY = "b28-history";
const PROGRESS_KEY = "b28-progress";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

function isLoggedIn() {
  return Boolean(getStoredTokens().accessToken);
}

export function getWatchlist(): string[] {
  return readJson<string[]>(WATCHLIST_KEY, []);
}

export async function toggleWatchlist(videoId: string): Promise<boolean> {
  if (isLoggedIn()) {
    const result = await toggleWatchlistRemote(videoId);
    const list = getWatchlist();
    const next = result.saved
      ? [...new Set([...list, videoId])]
      : list.filter((id) => id !== videoId);
    writeJson(WATCHLIST_KEY, next);
    return result.saved;
  }
  const list = getWatchlist();
  const exists = list.includes(videoId);
  const next = exists ? list.filter((id) => id !== videoId) : [...list, videoId];
  writeJson(WATCHLIST_KEY, next);
  return !exists;
}

export function isInWatchlist(videoId: string): boolean {
  return getWatchlist().includes(videoId);
}

export async function syncWatchlistFromApi(videos: CatalogVideo[]): Promise<CatalogVideo[]> {
  if (!isLoggedIn()) return getWatchlistVideos(videos);
  try {
    const remote = await getRemoteWatchlist();
    writeJson(WATCHLIST_KEY, remote.map((r) => r.videoSlug));
  } catch {
    // keep local
  }
  return getWatchlistVideos(videos);
}

export function getHistory(): string[] {
  return readJson<string[]>(HISTORY_KEY, []);
}

export function addToHistory(videoId: string) {
  const history = getHistory().filter((id) => id !== videoId);
  history.unshift(videoId);
  writeJson(HISTORY_KEY, history.slice(0, 50));
}

export function getProgressMap(): Record<string, WatchProgress> {
  return readJson<Record<string, WatchProgress>>(PROGRESS_KEY, {});
}

export async function saveProgress(videoId: string, progressSeconds: number) {
  const map = getProgressMap();
  map[videoId] = {
    videoId,
    progressSeconds,
    updatedAt: new Date().toISOString(),
  };
  writeJson(PROGRESS_KEY, map);
  if (isLoggedIn()) {
    try {
      await saveWatchProgress(videoId, progressSeconds);
    } catch {
      // local cache kept
    }
  }
}

export async function syncContinueWatchingFromApi(videos: CatalogVideo[]): Promise<{
  videos: CatalogVideo[];
  progressMap: Record<string, number>;
}> {
  const localMap = getProgressMap();
  const progressMap: Record<string, number> = {};
  Object.values(localMap).forEach((e) => {
    progressMap[e.videoId] = e.progressSeconds;
  });

  if (!isLoggedIn()) {
    return {
      videos: getContinueWatching(videos),
      progressMap,
    };
  }

  try {
    const remote = await getRemoteContinue();
    for (const entry of remote) {
      progressMap[entry.videoSlug] = entry.progressSeconds;
      localMap[entry.videoSlug] = {
        videoId: entry.videoSlug,
        progressSeconds: entry.progressSeconds,
        updatedAt: entry.updatedAt,
      };
    }
    writeJson(PROGRESS_KEY, localMap);
  } catch {
    // use local
  }

  const continueVideos = Object.entries(progressMap)
    .sort((a, b) => {
      const ta = localMap[a[0]]?.updatedAt ?? "";
      const tb = localMap[b[0]]?.updatedAt ?? "";
      return ta < tb ? 1 : -1;
    })
    .map(([id]) => videos.find((v) => v.videoId === id || v.id === id))
    .filter((v): v is CatalogVideo => Boolean(v))
    .slice(0, 10);

  return { videos: continueVideos, progressMap };
}

export function getContinueWatching(videos: CatalogVideo[], limit = 10): CatalogVideo[] {
  const map = getProgressMap();
  return Object.values(map)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((entry) => videos.find((v) => v.videoId === entry.videoId))
    .filter((v): v is CatalogVideo => Boolean(v))
    .slice(0, limit);
}

export async function removeFromContinueWatching(videoId: string) {
  const map = getProgressMap();
  delete map[videoId];
  writeJson(PROGRESS_KEY, map);
  if (isLoggedIn()) {
    try {
      await removeContinueWatching(videoId);
    } catch {
      // ignore
    }
  }
}

export function getWatchlistVideos(videos: CatalogVideo[]): CatalogVideo[] {
  const ids = getWatchlist();
  return ids
    .map((id) => videos.find((v) => v.videoId === id || v.id === id))
    .filter((v): v is CatalogVideo => Boolean(v));
}

export function getHistoryVideos(videos: CatalogVideo[]): CatalogVideo[] {
  const ids = getHistory();
  return ids
    .map((id) => videos.find((v) => v.videoId === id))
    .filter((v): v is CatalogVideo => Boolean(v));
}
