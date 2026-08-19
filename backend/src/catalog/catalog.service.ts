import { Injectable, NotFoundException } from '@nestjs/common';
import { PlaybackFormat, Prisma, VideoAccessTier } from '@prisma/client';
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

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getPublicCatalog(query: CatalogListQuery = {}) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 100));
    const where: Prisma.CatalogVideoWhereInput = { published: true };
    if (query.genre && query.genre !== 'All') {
      where.genre = query.genre;
    }

    const [videos, total, latest] = await Promise.all([
      this.prisma.catalogVideo.findMany({
        where,
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

    return {
      videos: videos.map((v) => this.toDto(v)),
      syncedAt: latest?.updatedAt.toISOString() ?? null,
      source: 'b28-oncodex-api',
      page,
      limit,
      total,
    };
  }

  async findBySlug(slug: string) {
    const record = await this.prisma.catalogVideo.findUnique({ where: { slug } });
    if (!record || !record.published) {
      throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: 'Catalog video not found.' });
    }
    return record;
  }

  async getVideoBySlug(slug: string): Promise<CatalogVideoDto> {
    const record = await this.findBySlug(slug);
    return this.toDto(record);
  }

  async getRelatedBySlug(slug: string, limit = 12): Promise<CatalogVideoDto[]> {
    const current = await this.findBySlug(slug);
    const take = Math.min(24, Math.max(1, limit));

    const videos = await this.prisma.catalogVideo.findMany({
      where: {
        published: true,
        slug: { not: slug },
        genre: current.genre,
      },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      take,
    });

    return videos.map((v) => this.toDto(v));
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
    return this.toAdminDto(record);
  }

  async bulkUpsert(items: UpsertCatalogVideoDto[]) {
    let count = 0;
    for (const item of items) {
      await this.upsert(item);
      count++;
    }
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
      return { message: 'Video unpublished.' };
    } catch {
      throw new NotFoundException({ code: 'VIDEO_NOT_FOUND', message: 'Catalog video not found.' });
    }
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
