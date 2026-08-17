import type { CatalogVideo } from "@/lib/types";

export function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getVideoById(videos: CatalogVideo[], videoId: string): CatalogVideo | undefined {
  return videos.find((v) => v.videoId === videoId || v.id === videoId);
}

export function filterVideos(
  videos: CatalogVideo[],
  filters: { genre?: string; decade?: string; type?: string; query?: string }
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
        v.seriesGroup.toLowerCase().includes(q)
    );
  }

  return result;
}

export interface ContentRow {
  title: string;
  items: CatalogVideo[];
}

export function getRowsFor(videos: CatalogVideo[], genreFilter: string): ContentRow[] {
  const base =
    genreFilter && genreFilter !== "All" && genreFilter !== "Popular"
      ? videos.filter((v) => v.genre === genreFilter)
      : videos;

  if (genreFilter === "Popular") {
    const items = shuffle(base).slice(0, 12);
    return items.length ? [{ title: "Popular on B28", items }] : [];
  }

  if (genreFilter && genreFilter !== "All") {
    const items = shuffle(base).slice(0, 10);
    return items.length ? [{ title: genreFilter, items }] : [];
  }

  return [
    { title: "Trending B28 Originals", items: shuffle(videos).slice(0, 12) },
    { title: "Drama", items: shuffle(videos.filter((v) => v.genre === "Drama")).slice(0, 10) },
    { title: "Action", items: shuffle(videos.filter((v) => v.genre === "Action")).slice(0, 10) },
    { title: "Thriller", items: shuffle(videos.filter((v) => v.genre === "Thriller")).slice(0, 10) },
    { title: "Horror", items: shuffle(videos.filter((v) => v.genre === "Horror")).slice(0, 10) },
  ].filter((r) => r.items.length > 0);
}

export function getRelatedVideos(videos: CatalogVideo[], current: CatalogVideo, limit = 8) {
  const sameGroup = videos.filter(
    (v) => v.seriesGroup === current.seriesGroup && v.id !== current.id
  );
  const sameGenre = videos.filter(
    (v) => v.genre === current.genre && v.id !== current.id && v.seriesGroup !== current.seriesGroup
  );
  return [...sameGroup, ...sameGenre, ...videos.filter((v) => v.id !== current.id)].slice(
    0,
    limit
  );
}
