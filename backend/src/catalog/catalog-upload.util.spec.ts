import {
  assertAllowedUploadContentType,
  buildCatalogAssetKey,
  type CatalogAssetKind,
} from './catalog-upload.util';

describe('catalog-upload.util', () => {
  it('builds deterministic keys per asset kind', () => {
    expect(buildCatalogAssetKey('sisi-leo', 'thumbnail', 'image/jpeg')).toBe(
      'catalog/sisi-leo/thumb.jpg',
    );
    expect(buildCatalogAssetKey('sisi-leo', 'poster', 'image/webp')).toBe(
      'catalog/sisi-leo/poster.webp',
    );
    expect(buildCatalogAssetKey('sisi-leo', 'film', 'video/mp4')).toBe('catalog/sisi-leo/film.mp4');
    expect(buildCatalogAssetKey('sisi-leo', 'film', 'video/quicktime')).toBe(
      'catalog/sisi-leo/film.mov',
    );
    expect(buildCatalogAssetKey('sisi-leo', 'film', 'video/x-matroska')).toBe(
      'catalog/sisi-leo/film.mkv',
    );
    expect(buildCatalogAssetKey('sisi-leo', 'film', 'application/octet-stream', 'clip.mkv')).toBe(
      'catalog/sisi-leo/film.mkv',
    );
    expect(buildCatalogAssetKey('sisi-leo', 'trailer', 'video/mp4')).toBe(
      'catalog/sisi-leo/trailer.mp4',
    );
  });

  it('rejects image content type for film uploads', () => {
    expect(() =>
      assertAllowedUploadContentType('film' as CatalogAssetKind, 'image/jpeg'),
    ).toThrow();
  });
});
