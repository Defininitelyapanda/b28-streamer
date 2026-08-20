import type { CatalogVideo } from "@/lib/types";

export function scoreVideo(v: CatalogVideo): number {
  return parseFloat(v.rating || "0") || 0;
}

function compareVideos(a: CatalogVideo, b: CatalogVideo): number {
  const scoreDiff = scoreVideo(b) - scoreVideo(a);
  if (Math.abs(scoreDiff) > 0.3) return scoreDiff;
  if (a.type === "film" && b.type !== "film") return -1;
  if (b.type === "film" && a.type !== "film") return 1;
  return b.date.localeCompare(a.date);
}

export function pickPopularVideos(videos: CatalogVideo[], limit = 16): CatalogVideo[] {
  const sorted = [...videos].sort(compareVideos);
  const seen = new Set<string>();
  const picked: CatalogVideo[] = [];

  for (const video of sorted) {
    const key = video.seriesGroup || video.id;
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(video);
    if (picked.length >= limit) break;
  }

  if (picked.length < limit) {
    for (const video of sorted) {
      if (picked.some((p) => p.id === video.id)) continue;
      picked.push(video);
      if (picked.length >= limit) break;
    }
  }

  return picked;
}

export function sortFeaturedVideos(videos: CatalogVideo[], limit = 6): CatalogVideo[] {
  return [...videos].sort(compareVideos).slice(0, limit);
}

export function getVideoById(videos: CatalogVideo[], videoId: string): CatalogVideo | undefined {
  return videos.find((v) => v.videoId === videoId || v.id === videoId);
}

export function filterVideos(
  videos: CatalogVideo[],
  filters: { genre?: string; decade?: string; type?: string; query?: string },
): CatalogVideo[] {
  let result = [...videos];

  if (filters.genre && filters.genre !== "All" && filters.genre !== "Popular") {
    result = result.filter((v) => v.genre === filters.genre);
  }

  if (filters.type && filters.type !== "All") {
    result = result.filter((v) => v.type === filters.type);
  }

  if (filters.decade && filters.decade !== "All") {
    result = result.filter((v) => {
      const year = parseInt(v.date.slice(0, 4), 10);
      if (filters.decade === "2020s") return year >= 2020;
      if (filters.decade === "2010s") return year >= 2010 && year < 2020;
      if (filters.decade === "2000s") return year >= 2000 && year < 2010;
      return true;
    });
  }

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter(
      (v) =>
        v.title.toLowerCase().includes(q) ||
        v.genre.toLowerCase().includes(q) ||
        v.desc.toLowerCase().includes(q) ||
        v.seriesGroup.toLowerCase().includes(q),
    );
  }

  return result;
}

export interface ContentRow {
  title: string;
  items: CatalogVideo[];
}

export function pickByGenre(videos: CatalogVideo[], genre: string, limit: number): CatalogVideo[] {
  return [...videos]
    .filter((v) => v.genre === genre)
    .sort(compareVideos)
    .slice(0, limit);
}

export function getRowsFor(videos: CatalogVideo[], genreFilter: string): ContentRow[] {
  const base =
    genreFilter && genreFilter !== "All" && genreFilter !== "Popular"
      ? videos.filter((v) => v.genre === genreFilter)
      : videos;

  if (genreFilter === "Popular") {
    const items = pickPopularVideos(base, 12);
    return items.length ? [{ title: "Popular on B28", items }] : [];
  }

  if (genreFilter && genreFilter !== "All") {
    const items = [...base].sort(compareVideos).slice(0, 10);
    return items.length ? [{ title: genreFilter, items }] : [];
  }

  return [
    { title: "Trending B28 Originals", items: pickPopularVideos(videos, 12) },
    { title: "Drama", items: pickByGenre(videos, "Drama", 10) },
    { title: "Action", items: pickByGenre(videos, "Action", 10) },
    { title: "Thriller", items: pickByGenre(videos, "Thriller", 10) },
    { title: "Horror", items: pickByGenre(videos, "Horror", 10) },
  ].filter((r) => r.items.length > 0);
}

export function getRelatedVideos(videos: CatalogVideo[], current: CatalogVideo, limit = 8) {
  const seen = new Set<string>([current.id]);
  const result: CatalogVideo[] = [];

  const pushUnique = (video: CatalogVideo) => {
    if (seen.has(video.id)) return;
    seen.add(video.id);
    result.push(video);
  };

  for (const video of videos) {
    if (video.seriesGroup === current.seriesGroup) pushUnique(video);
  }
  for (const video of videos) {
    if (video.genre === current.genre) pushUnique(video);
  }
  for (const video of videos) {
    pushUnique(video);
  }

  return result.slice(0, limit);
}
