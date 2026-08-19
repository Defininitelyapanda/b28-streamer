import { Injectable, NotFoundException } from '@nestjs/common';
import { PlaybackFormat, Prisma, VideoAccessTier } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCatalogVideoDto, UpsertCatalogVideoDto } from './dto/catalog.dto';

export interface CatalogVideoDto {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  genre: string;
  desc: string;
  rating: string;
  sourceType: string;
  videoId: string;
  type: string;
  seriesGroup: string;
  accessTier: VideoAccessTier;
  playbackFormat: PlaybackFormat;
  durationSeconds?: number | null;
  posterUrl?: string | null;
  published?: boolean;
}

export interface CatalogListQuery {
  page?: number;
  limit?: number;
  genre?: string;
}

const CATALOG_LIST_SELECT = {
  slug: true,
  title: true,
  thumbnail: true,
  date: true,
  genre: true,
  rating: true,
  sourceType: true,
  videoId: true,
  type: true,
  seriesGroup: true,
  accessTier: true,
  playbackFormat: true,
  durationSeconds: true,
  posterUrl: true,
} satisfies Prisma.CatalogVideoSelect;

type CatalogListRecord = Prisma.CatalogVideoGetPayload<{ select: typeof CATALOG_LIST_SELECT }>;

@Injectable()
export class CatalogService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async getPublicCatalog(query: CatalogListQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 100));
    const genreKey = query.genre && query.genre !== 'All' ? query.genre : 'all';
    const cacheKey = `catalog:list:${page}:${limit}:${genreKey}`;

    const cached = await this.cache.get<{
      videos: CatalogVideoDto[];
      syncedAt: string | null;
      source: string;
      page: number;
      limit: number;
      total: number;
    }>(cacheKey);
    if (cached) return cached;

    const where: Prisma.CatalogVideoWhereInput = { published: true };
    if (query.genre && query.genre !== 'All') {
      where.genre = query.genre;
    }

    const [videos, total, latest] = await Promise.all([
      this.prisma.catalogVideo.findMany({
        where,
        select: CATALOG_LIST_SELECT,
        orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.catalogVideo.count({ where }),
      this.prisma.catalogVideo.findFirst({
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    const result = {
      videos: videos.map((v) => this.toListDto(v)),
      syncedAt: latest?.updatedAt.toISOString() ?? null,
      source: 'b28-oncodex-api',
      page,
      limit,
      total,
    };

    await this.cache.set(cacheKey, result, 60);
    return result;
  }

  async findBySlug(slug: string) {
    const record = await this.prisma.catalogVideo.findUnique({ where: { slug } });
    if (!record || !record.published) {
      throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: 'Catalog video not found.' });
    }
    return record;
  }

  async getVideoBySlug(slug: string): Promise<CatalogVideoDto> {
    const cacheKey = `catalog:slug:${slug}`;
    const cached = await this.cache.get<CatalogVideoDto>(cacheKey);
    if (cached) return cached;

    const record = await this.findBySlug(slug);
    const dto = this.toDto(record);
    await this.cache.set(cacheKey, dto, 120);
    return dto;
  }

  async getRelatedBySlug(slug: string, limit = 12): Promise<CatalogVideoDto[]> {
    const take = Math.min(24, Math.max(1, limit));
    const cacheKey = `catalog:related:${slug}:${take}`;
    const cached = await this.cache.get<CatalogVideoDto[]>(cacheKey);
    if (cached) return cached;

    const current = await this.findBySlug(slug);

    const videos = await this.prisma.catalogVideo.findMany({
      where: {
        published: true,
        slug: { not: slug },
        genre: current.genre,
      },
      select: CATALOG_LIST_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take,
    });

    const result = videos.map((v) => this.toListDto(v));
    await this.cache.set(cacheKey, result, 120);
    return result;
  }

  async listAll() {
    const videos = await this.prisma.catalogVideo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return videos.map((v) => this.toAdminDto(v));
  }

  async upsert(dto: UpsertCatalogVideoDto) {
    const record = await this.prisma.catalogVideo.upsert({
      where: { slug: dto.slug },
      create: {
        slug: dto.slug,
        title: dto.title,
        thumbnail: dto.thumbnail,
        date: dto.date,
        genre: dto.genre,
        description: dto.description,
        rating: dto.rating,
        sourceType: dto.sourceType,
        videoId: dto.videoId,
        type: dto.type,
        seriesGroup: dto.seriesGroup,
        accessTier: dto.accessTier ?? VideoAccessTier.FREE,
        playbackFormat: dto.playbackFormat ?? PlaybackFormat.YOUTUBE,
        storageKey: dto.storageKey ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        posterUrl: dto.posterUrl ?? null,
        published: dto.published ?? true,
      },
      update: {
        title: dto.title,
        thumbnail: dto.thumbnail,
        date: dto.date,
        genre: dto.genre,
        description: dto.description,
        rating: dto.rating,
        sourceType: dto.sourceType,
        videoId: dto.videoId,
        type: dto.type,
        seriesGroup: dto.seriesGroup,
        accessTier: dto.accessTier ?? VideoAccessTier.FREE,
        playbackFormat: dto.playbackFormat ?? PlaybackFormat.YOUTUBE,
        storageKey: dto.storageKey ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        posterUrl: dto.posterUrl ?? null,
        published: dto.published ?? true,
      },
    });
    await this.cache.invalidateCatalog();
    return this.toAdminDto(record);
  }

  async bulkUpsert(items: UpsertCatalogVideoDto[]) {
    let count = 0;
    for (const item of items) {
      await this.upsertWithoutInvalidation(item);
      count++;
    }
    await this.cache.invalidateCatalog();
    return { count, syncedAt: new Date().toISOString() };
  }

  async update(slug: string, dto: UpdateCatalogVideoDto) {
    try {
      const record = await this.prisma.catalogVideo.update({
        where: { slug },
        data: {
          title: dto.title,
          thumbnail: dto.thumbnail,
          date: dto.date,
          genre: dto.genre,
          description: dto.description,
          rating: dto.rating,
          type: dto.type,
          seriesGroup: dto.seriesGroup,
          sourceType: dto.sourceType,
          videoId: dto.videoId,
          accessTier: dto.accessTier,
          playbackFormat: dto.playbackFormat,
          storageKey: dto.storageKey,
          durationSeconds: dto.durationSeconds,
          posterUrl: dto.posterUrl,
          published: dto.published,
        },
      });
      await this.cache.invalidateCatalog();
      return this.toAdminDto(record);
    } catch {
      throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: 'Catalog video not found.' });
    }
  }

  async remove(slug: string) {
    try {
      await this.prisma.catalogVideo.update({
        where: { slug },
        data: { published: false },
      });
      await this.cache.invalidateCatalog();
      return { message: 'Video unpublished.' };
    } catch {
      throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: 'Catalog video not found.' });
    }
  }

  private async upsertWithoutInvalidation(dto: UpsertCatalogVideoDto) {
    await this.prisma.catalogVideo.upsert({
      where: { slug: dto.slug },
      create: {
        slug: dto.slug,
        title: dto.title,
        thumbnail: dto.thumbnail,
        date: dto.date,
        genre: dto.genre,
        description: dto.description,
        rating: dto.rating,
        sourceType: dto.sourceType,
        videoId: dto.videoId,
        type: dto.type,
        seriesGroup: dto.seriesGroup,
        accessTier: dto.accessTier ?? VideoAccessTier.FREE,
        playbackFormat: dto.playbackFormat ?? PlaybackFormat.YOUTUBE,
        storageKey: dto.storageKey ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        posterUrl: dto.posterUrl ?? null,
        published: dto.published ?? true,
      },
      update: {
        title: dto.title,
        thumbnail: dto.thumbnail,
        date: dto.date,
        genre: dto.genre,
        description: dto.description,
        rating: dto.rating,
        sourceType: dto.sourceType,
        videoId: dto.videoId,
        type: dto.type,
        seriesGroup: dto.seriesGroup,
        accessTier: dto.accessTier ?? VideoAccessTier.FREE,
        playbackFormat: dto.playbackFormat ?? PlaybackFormat.YOUTUBE,
        storageKey: dto.storageKey ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        posterUrl: dto.posterUrl ?? null,
        published: dto.published ?? true,
      },
    });
  }

  private toListDto(v: CatalogListRecord): CatalogVideoDto {
    return {
      id: v.slug,
      title: v.title,
      thumbnail: v.posterUrl ?? v.thumbnail,
      date: v.date,
      genre: v.genre,
      desc: '',
      rating: v.rating,
      sourceType: v.sourceType,
      videoId: v.videoId,
      type: v.type,
      seriesGroup: v.seriesGroup,
      accessTier: v.accessTier,
      playbackFormat: v.playbackFormat,
      durationSeconds: v.durationSeconds,
      posterUrl: v.posterUrl,
    };
  }

  private toDto(v: {
    slug: string;
    title: string;
    thumbnail: string;
    date: string;
    genre: string;
    description: string;
    rating: string;
    sourceType: string;
    videoId: string;
    type: string;
    seriesGroup: string;
    accessTier: VideoAccessTier;
    playbackFormat: PlaybackFormat;
    durationSeconds: number | null;
    posterUrl: string | null;
  }): CatalogVideoDto {
    return {
      id: v.slug,
      title: v.title,
      thumbnail: v.posterUrl ?? v.thumbnail,
      date: v.date,
      genre: v.genre,
      desc: v.description,
      rating: v.rating,
      sourceType: v.sourceType,
      videoId: v.videoId,
      type: v.type,
      seriesGroup: v.seriesGroup,
      accessTier: v.accessTier,
      playbackFormat: v.playbackFormat,
      durationSeconds: v.durationSeconds,
      posterUrl: v.posterUrl,
    };
  }

  private toAdminDto(v: {
    slug: string;
    title: string;
    thumbnail: string;
    date: string;
    genre: string;
    description: string;
    rating: string;
    sourceType: string;
    videoId: string;
    type: string;
    seriesGroup: string;
    accessTier: VideoAccessTier;
    playbackFormat: PlaybackFormat;
    storageKey: string | null;
    durationSeconds: number | null;
    posterUrl: string | null;
    published: boolean;
  }) {
    return {
      ...this.toDto(v),
      storageKey: v.storageKey,
      published: v.published,
    };
  }
}
