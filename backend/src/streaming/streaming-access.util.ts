export interface CatalogPlaybackRecord {
  type: string;
  published?: boolean;
}

export function isPublicTrailer(video: CatalogPlaybackRecord): boolean {
  return video.type === 'trailer' && video.published !== false;
}

export function isFullFilm(video: CatalogPlaybackRecord): boolean {
  return video.type !== 'trailer';
}
