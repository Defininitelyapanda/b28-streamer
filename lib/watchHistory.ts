import type { CatalogVideo, WatchProgress } from "@/lib/types";

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

export function getWatchlist(): string[] {
  return readJson<string[]>(WATCHLIST_KEY, []);
}

export function toggleWatchlist(videoId: string): boolean {
  const list = getWatchlist();
  const exists = list.includes(videoId);
  const next = exists ? list.filter((id) => id !== videoId) : [...list, videoId];
  writeJson(WATCHLIST_KEY, next);
  return !exists;
}

export function isInWatchlist(videoId: string): boolean {
  return getWatchlist().includes(videoId);
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

export function saveProgress(videoId: string, progressSeconds: number) {
  const map = getProgressMap();
  map[videoId] = {
    videoId,
    progressSeconds,
    updatedAt: new Date().toISOString(),
  };
  writeJson(PROGRESS_KEY, map);
}

export function getContinueWatching(videos: CatalogVideo[], limit = 10): CatalogVideo[] {
  const map = getProgressMap();
  return Object.values(map)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .map((entry) => videos.find((v) => v.videoId === entry.videoId))
    .filter((v): v is CatalogVideo => Boolean(v))
    .slice(0, limit);
}

export function getWatchlistVideos(videos: CatalogVideo[]): CatalogVideo[] {
  const ids = getWatchlist();
  return ids
    .map((id) => videos.find((v) => v.videoId === id))
    .filter((v): v is CatalogVideo => Boolean(v));
}

export function getHistoryVideos(videos: CatalogVideo[]): CatalogVideo[] {
  const ids = getHistory();
  return ids
    .map((id) => videos.find((v) => v.videoId === id))
    .filter((v): v is CatalogVideo => Boolean(v));
}
