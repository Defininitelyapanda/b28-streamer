import type { CatalogVideo, VideoType } from "@/lib/types";
import rawOverrides from "@/config/overrides.json";

const overrides = rawOverrides as {
  genres?: Record<string, string>;
  seriesGroups?: Record<string, string>;
};

const TRAILER_KEYWORDS = /\b(trailer|teaser|preview)\b/i;

const GENRE_KEYWORDS: Record<string, RegExp> = {
  Horror: /\b(horror|scary|nightmare)\b/i,
  Thriller: /\b(thriller|suspense|mystery)\b/i,
  Action: /\b(action|fight|combat|youth struggles)\b/i,
  Drama: /\b(drama|relationship|love|heart|struggle|film|movie|short film)\b/i,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

export function detectVideoType(title: string): VideoType {
  return TRAILER_KEYWORDS.test(title) ? "trailer" : "film";
}

export function detectGenre(title: string, description: string, videoId: string): string {
  const override = overrides.genres?.[videoId];
  if (override && !override.startsWith("_")) return override;

  const text = `${title} ${description}`;
  for (const [genre, pattern] of Object.entries(GENRE_KEYWORDS)) {
    if (pattern.test(text)) return genre;
  }
  return "Drama";
}

export function detectSeriesGroup(title: string, videoId: string): string {
  const override = overrides.seriesGroups?.[videoId];
  if (override && !override.startsWith("_")) return override;

  const cleaned = title
    .replace(/\b(official|film|movie|trailer|teaser|kenyan|short film|latest \d{4} movie)\b/gi, "")
    .replace(/\|.*$/g, "")
    .replace(/[-–—].*$/g, "")
    .trim();

  return slugify(cleaned || title.slice(0, 40));
}

export function classifyVideo(
  video: Pick<CatalogVideo, "title" | "desc" | "videoId"> & Partial<CatalogVideo>
): Pick<CatalogVideo, "type" | "genre" | "seriesGroup"> {
  return {
    type: video.type || detectVideoType(video.title),
    genre: video.genre || detectGenre(video.title, video.desc, video.videoId),
    seriesGroup: video.seriesGroup || detectSeriesGroup(video.title, video.videoId),
  };
}

export function stableRating(videoId: string): string {
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = (hash << 5) - hash + videoId.charCodeAt(i);
    hash |= 0;
  }
  return (7.5 + (Math.abs(hash) % 15) / 10).toFixed(1);
}
