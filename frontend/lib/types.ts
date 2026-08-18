export type VideoType = "film" | "trailer";

export type Genre = "Drama" | "Action" | "Thriller" | "Horror" | "Popular";

export interface CatalogVideo {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  genre: string;
  desc: string;
  rating: string;
  sourceType: string;
  videoId: string;
  type: VideoType;
  seriesGroup: string;
}

export interface CatalogData {
  videos: CatalogVideo[];
  syncedAt: string | null;
  source: string;
}

export interface WatchProgress {
  videoId: string;
  progressSeconds: number;
  updatedAt: string;
}

export interface BrowseFilters {
  genre: string;
  decade: string;
  type: string;
  query: string;
}

export const GENRES = ["All", "Drama", "Action", "Thriller", "Horror", "Popular"] as const;

export const DECADES = ["All", "2020s", "2010s", "2000s"] as const;

export const VIDEO_TYPES = ["All", "film", "trailer"] as const;
