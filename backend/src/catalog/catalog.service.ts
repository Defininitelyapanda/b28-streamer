import { Injectable, NotFoundException } from '@nestjs/common';
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
  published?: boolean;
}

@Injectable()
export class CatalogService {
  constructor(private prisma: PrismaService) {}

  async getPublicCatalog() {
    const videos = await this.prisma.catalogVideo.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });

    const latest = await this.prisma.catalogVideo.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true },
    });

    return {
      videos: videos.map((v) => this.toDto(v)),
      syncedAt: latest?.updatedAt.toISOString() ?? null,
      source: 'b28-oncodex-api',
    };
  }

  async listAll() {
    const videos = await this.prisma.catalogVideo.findMany({
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return videos.map((v) => ({ ...this.toDto(v), published: v.published }));
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
        published: dto.published ?? true,
      },
    });
    return { ...this.toDto(record), published: record.published };
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
          published: dto.published,
        },
      });
      return { ...this.toDto(record), published: record.published };
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
  }): CatalogVideoDto {
    return {
      id: v.slug,
      title: v.title,
      thumbnail: v.thumbnail,
      date: v.date,
      genre: v.genre,
      desc: v.description,
      rating: v.rating,
      sourceType: v.sourceType,
      videoId: v.videoId,
      type: v.type,
      seriesGroup: v.seriesGroup,
    };
  }
}
