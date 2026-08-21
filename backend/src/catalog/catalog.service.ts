import { Injectable, NotFoundException } from '@nestjs/common';
import { PlaybackFormat, Prisma, VideoAccessTier } from '@prisma/client';
import { CacheService } from '../common/cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCatalogVideoDto, UpsertCatalogVideoDto, PublishTitleBundleDto } from './dto/catalog.dto';
import { trailerSlugForBaseSlug } from './catalog-upload.util';
import type { R2StorageService } from '../storage/r2-storage.service';

export interface CatalogVideoDto {
  id: string;
  title: string;
  thumbnail: string;
  date: string;
  genre: string;
  desc: string;
  rating: string;
  sourceType: string;
  videoId?: string;
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
  q?: string;
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
    const searchKey = query.q?.trim().toLowerCase() || 'all';
    const cacheKey = `catalog:list:${page}:${limit}:${genreKey}:${searchKey}`;

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
    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
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
        playbackFormat: dto.playbackFormat ?? PlaybackFormat.MP4,
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
        playbackFormat: dto.playbackFormat ?? PlaybackFormat.MP4,
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
    const chunkSize = 25;
    let count = 0;

    for (let i = 0; i < items.length; i += chunkSize) {
      const chunk = items.slice(i, i + chunkSize);
      await this.prisma.$transaction(
        chunk.map((item) =>
          this.prisma.catalogVideo.upsert({
            where: { slug: item.slug },
            create: this.buildCreateData(item),
            update: this.buildFullUpdateData(item),
          }),
        ),
      );
      count += chunk.length;
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

  private buildCreateData(dto: UpsertCatalogVideoDto): Prisma.CatalogVideoCreateInput {
    return {
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
      playbackFormat: dto.playbackFormat ?? PlaybackFormat.MP4,
      storageKey: dto.storageKey ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      posterUrl: dto.posterUrl ?? null,
      published: dto.published ?? true,
    };
  }

  private buildFullUpdateData(dto: UpsertCatalogVideoDto): Prisma.CatalogVideoUpdateInput {
    return {
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
      playbackFormat: dto.playbackFormat ?? PlaybackFormat.MP4,
      storageKey: dto.storageKey ?? null,
      durationSeconds: dto.durationSeconds ?? null,
      posterUrl: dto.posterUrl ?? null,
      published: dto.published ?? true,
    };
  }

  private toListDto(v: CatalogListRecord): CatalogVideoDto {
    const dto: CatalogVideoDto = {
      id: v.slug,
      title: v.title,
      thumbnail: v.posterUrl ?? v.thumbnail,
      date: v.date,
      genre: v.genre,
      desc: '',
      rating: v.rating,
      sourceType: v.sourceType,
      type: v.type,
      seriesGroup: v.seriesGroup,
      accessTier: v.accessTier,
      playbackFormat: v.playbackFormat,
      durationSeconds: v.durationSeconds,
      posterUrl: v.posterUrl,
    };

    return dto;
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
    const dto: CatalogVideoDto = {
      id: v.slug,
      title: v.title,
      thumbnail: v.posterUrl ?? v.thumbnail,
      date: v.date,
      genre: v.genre,
      desc: v.description,
      rating: v.rating,
      sourceType: v.sourceType,
      type: v.type,
      seriesGroup: v.seriesGroup,
      accessTier: v.accessTier,
      playbackFormat: v.playbackFormat,
      durationSeconds: v.durationSeconds,
      posterUrl: v.posterUrl,
    };

    return dto;
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

  async publishTitleBundle(dto: PublishTitleBundleDto, r2Storage: R2StorageService) {
    const seriesGroup = dto.seriesGroup ?? dto.title;
    const playbackFormat = dto.playbackFormat ?? PlaybackFormat.MP4;
    const thumbnail = r2Storage.getPublicObjectUrl(dto.thumbnailKey);
    const posterUrl = dto.posterKey
      ? r2Storage.getPublicObjectUrl(dto.posterKey)
      : thumbnail;

    const filmDto: UpsertCatalogVideoDto = {
      slug: dto.slug,
      title: dto.title,
      thumbnail,
      date: dto.date,
      genre: dto.genre,
      description: dto.description,
      rating: dto.rating,
      sourceType: 'r2',
      videoId: dto.slug,
      type: 'film',
      seriesGroup,
      accessTier: dto.accessTier ?? VideoAccessTier.FREE,
      playbackFormat,
      storageKey: dto.filmStorageKey,
      posterUrl,
      published: dto.published ?? true,
    };

    const trailerSlug = trailerSlugForBaseSlug(dto.slug);
    const trailerDto: UpsertCatalogVideoDto | null = dto.trailerStorageKey
      ? {
          slug: trailerSlug,
          title: `${dto.title} (Trailer)`,
          thumbnail,
          date: dto.date,
          genre: dto.genre,
          description: dto.description,
          rating: dto.rating,
          sourceType: 'r2',
          videoId: trailerSlug,
          type: 'trailer',
          seriesGroup,
          accessTier: dto.accessTier ?? VideoAccessTier.FREE,
          playbackFormat,
          storageKey: dto.trailerStorageKey,
          posterUrl,
          published: dto.published ?? true,
        }
      : null;

    const [film] = await this.prisma.$transaction(async (tx) => {
      const filmRecord = await tx.catalogVideo.upsert({
        where: { slug: dto.slug },
        create: {
          slug: filmDto.slug,
          title: filmDto.title,
          thumbnail: filmDto.thumbnail,
          date: filmDto.date,
          genre: filmDto.genre,
          description: filmDto.description,
          rating: filmDto.rating,
          sourceType: filmDto.sourceType,
          videoId: filmDto.videoId,
          type: filmDto.type,
          seriesGroup: filmDto.seriesGroup,
          accessTier: filmDto.accessTier ?? VideoAccessTier.FREE,
          playbackFormat: filmDto.playbackFormat ?? PlaybackFormat.MP4,
          storageKey: filmDto.storageKey ?? null,
          posterUrl: filmDto.posterUrl ?? null,
          published: filmDto.published ?? true,
        },
        update: {
          title: filmDto.title,
          thumbnail: filmDto.thumbnail,
          date: filmDto.date,
          genre: filmDto.genre,
          description: filmDto.description,
          rating: filmDto.rating,
          sourceType: filmDto.sourceType,
          videoId: filmDto.videoId,
          type: filmDto.type,
          seriesGroup: filmDto.seriesGroup,
          accessTier: filmDto.accessTier ?? VideoAccessTier.FREE,
          playbackFormat: filmDto.playbackFormat ?? PlaybackFormat.MP4,
          storageKey: filmDto.storageKey ?? null,
          posterUrl: filmDto.posterUrl ?? null,
          published: filmDto.published ?? true,
        },
      });

      if (trailerDto) {
        await tx.catalogVideo.upsert({
          where: { slug: trailerDto.slug },
          create: {
            slug: trailerDto.slug,
            title: trailerDto.title,
            thumbnail: trailerDto.thumbnail,
            date: trailerDto.date,
            genre: trailerDto.genre,
            description: trailerDto.description,
            rating: trailerDto.rating,
            sourceType: trailerDto.sourceType,
            videoId: trailerDto.videoId,
            type: trailerDto.type,
            seriesGroup: trailerDto.seriesGroup,
            accessTier: trailerDto.accessTier ?? VideoAccessTier.FREE,
            playbackFormat: trailerDto.playbackFormat ?? PlaybackFormat.MP4,
            storageKey: trailerDto.storageKey ?? null,
            posterUrl: trailerDto.posterUrl ?? null,
            published: trailerDto.published ?? true,
          },
          update: {
            title: trailerDto.title,
            thumbnail: trailerDto.thumbnail,
            date: trailerDto.date,
            genre: trailerDto.genre,
            description: trailerDto.description,
            rating: trailerDto.rating,
            sourceType: trailerDto.sourceType,
            videoId: trailerDto.videoId,
            type: trailerDto.type,
            seriesGroup: trailerDto.seriesGroup,
            accessTier: trailerDto.accessTier ?? VideoAccessTier.FREE,
            playbackFormat: trailerDto.playbackFormat ?? PlaybackFormat.MP4,
            storageKey: trailerDto.storageKey ?? null,
            posterUrl: trailerDto.posterUrl ?? null,
            published: trailerDto.published ?? true,
          },
        });
      }

      return [filmRecord];
    });

    await this.cache.invalidateCatalog();

    return {
      film: this.toAdminDto(film),
      trailerSlug: trailerDto ? trailerSlug : null,
    };
  }
}
