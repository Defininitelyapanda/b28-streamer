import { BadRequestException } from '@nestjs/common';

export type CatalogAssetKind = 'thumbnail' | 'poster' | 'film' | 'trailer';

const VIDEO_CONTENT_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/x-matroska',
  'video/webm',
  'video/x-msvideo',
  'application/octet-stream',
  'application/x-mpegURL',
  'application/vnd.apple.mpegurl',
]);

const IMAGE_CONTENT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const VIDEO_EXT_FROM_TYPE: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'video/x-matroska': 'mkv',
  'video/webm': 'webm',
  'video/x-msvideo': 'avi',
};

const VIDEO_EXT_FROM_NAME = new Set(['mp4', 'mov', 'mkv', 'webm', 'avi', 'm3u8']);

export function assertAllowedUploadContentType(
  assetKind: CatalogAssetKind,
  contentType: string,
): void {
  const isImage = IMAGE_CONTENT_TYPES.has(contentType);
  const isVideo = VIDEO_CONTENT_TYPES.has(contentType);

  if (assetKind === 'thumbnail' || assetKind === 'poster') {
    if (!isImage) {
      throw new BadRequestException({
        code: 'INVALID_CONTENT_TYPE',
        message: 'Thumbnail and poster uploads require image/jpeg, image/png, or image/webp.',
      });
    }
    return;
  }

  if (!isVideo) {
    throw new BadRequestException({
      code: 'INVALID_CONTENT_TYPE',
      message:
        'Film and trailer uploads require a supported video type (MP4, MOV, MKV, WebM, AVI, or HLS).',
    });
  }
}

function extensionFromFileName(fileName?: string): string | null {
  if (!fileName) return null;
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext || !VIDEO_EXT_FROM_NAME.has(ext)) return null;
  return ext;
}

function videoExtension(contentType: string, fileName?: string): string {
  if (contentType.includes('mpeg')) return 'm3u8';
  if (VIDEO_EXT_FROM_TYPE[contentType]) return VIDEO_EXT_FROM_TYPE[contentType];
  const fromName = extensionFromFileName(fileName);
  if (fromName) return fromName;
  return 'mp4';
}

export function buildCatalogAssetKey(
  slug: string,
  assetKind: CatalogAssetKind,
  contentType: string,
  fileName?: string,
): string {
  const base = `catalog/${slug}`;

  if (assetKind === 'thumbnail') {
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    return `${base}/thumb.${ext}`;
  }

  if (assetKind === 'poster') {
    const ext = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg';
    return `${base}/poster.${ext}`;
  }

  const ext = videoExtension(contentType, fileName);
  if (assetKind === 'film') {
    return `${base}/film.${ext}`;
  }

  return `${base}/trailer.${ext}`;
}

export function trailerSlugForBaseSlug(slug: string): string {
  return `${slug}-trailer`;
}
