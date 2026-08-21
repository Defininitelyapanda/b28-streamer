import { NotFoundException } from '@nestjs/common';
import { PlaybackFormat, VideoAccessTier } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { CatalogService } from './catalog.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CatalogService', () => {
  let service: CatalogService;
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    invalidateCatalog: jest.fn(),
  } as unknown as CacheService;

  const prisma = {
    catalogVideo: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    service = new CatalogService(prisma, cache);
    jest.clearAllMocks();
  });

  it('returns cached catalog list on cache hit', async () => {
    const cached = {
      videos: [],
      syncedAt: '2026-01-01T00:00:00.000Z',
      source: 'b28-oncodex-api',
      page: 1,
      limit: 100,
      total: 0,
    };
    (cache.get as jest.Mock).mockResolvedValue(cached);

    const result = await service.getPublicCatalog();

    expect(result).toEqual(cached);
    expect(prisma.catalogVideo.findMany).not.toHaveBeenCalled();
  });

  it('loads catalog list from database on cache miss', async () => {
    (cache.get as jest.Mock).mockResolvedValue(null);
    (prisma.catalogVideo.findMany as jest.Mock).mockResolvedValue([
      {
        slug: 'abc123',
        title: 'Test Film',
        thumbnail: 'thumb.jpg',
        date: '2026-01-01',
        genre: 'Drama',
        rating: '8.0',
        sourceType: 'youtube',
        videoId: 'abc123',
        type: 'film',
        seriesGroup: 'Test Film',
        accessTier: VideoAccessTier.FREE,
        playbackFormat: PlaybackFormat.YOUTUBE,
        durationSeconds: null,
        posterUrl: null,
      },
    ]);
    (prisma.catalogVideo.count as jest.Mock).mockResolvedValue(1);
    (prisma.catalogVideo.findFirst as jest.Mock).mockResolvedValue({
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.getPublicCatalog();

    expect(result.videos).toHaveLength(1);
    expect(result.videos[0].id).toBe('abc123');
    expect(result.videos[0].desc).toBe('');
    expect(result.videos[0].videoId).toBe('abc123');
    expect(cache.set).toHaveBeenCalledWith(
      'catalog:list:1:100:all',
      expect.objectContaining({ total: 1 }),
      60,
    );
  });

  it('omits videoId from public list for premium titles', async () => {
    (cache.get as jest.Mock).mockResolvedValue(null);
    (prisma.catalogVideo.findMany as jest.Mock).mockResolvedValue([
      {
        slug: 'premium1',
        title: 'Premium Film',
        thumbnail: 'thumb.jpg',
        date: '2026-01-01',
        genre: 'Drama',
        rating: '8.0',
        sourceType: 'youtube',
        videoId: 'premium1',
        type: 'film',
        seriesGroup: 'Premium Film',
        accessTier: VideoAccessTier.PREMIUM,
        playbackFormat: PlaybackFormat.YOUTUBE,
        durationSeconds: null,
        posterUrl: null,
      },
    ]);
    (prisma.catalogVideo.count as jest.Mock).mockResolvedValue(1);
    (prisma.catalogVideo.findFirst as jest.Mock).mockResolvedValue({
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const result = await service.getPublicCatalog();

    expect(result.videos[0].videoId).toBeUndefined();
  });

  it('throws when slug is missing or unpublished', async () => {
    (cache.get as jest.Mock).mockResolvedValue(null);
    (prisma.catalogVideo.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.getVideoBySlug('missing')).rejects.toThrow(NotFoundException);
  });

  it('invalidates cache after upsert', async () => {
    (prisma.catalogVideo.upsert as jest.Mock).mockResolvedValue({
      slug: 'abc123',
      title: 'Test Film',
      thumbnail: 'thumb.jpg',
      date: '2026-01-01',
      genre: 'Drama',
      description: 'Desc',
      rating: '8.0',
      sourceType: 'youtube',
      videoId: 'abc123',
      type: 'film',
      seriesGroup: 'Test Film',
      accessTier: VideoAccessTier.FREE,
      playbackFormat: PlaybackFormat.YOUTUBE,
      storageKey: null,
      durationSeconds: null,
      posterUrl: null,
      published: true,
    });

    await service.upsert({
      slug: 'abc123',
      title: 'Test Film',
      thumbnail: 'thumb.jpg',
      date: '2026-01-01',
      genre: 'Drama',
      description: 'Desc',
      rating: '8.0',
      sourceType: 'youtube',
      videoId: 'abc123',
      type: 'film',
      seriesGroup: 'Test Film',
    });

    expect(cache.invalidateCatalog).toHaveBeenCalled();
  });
});
