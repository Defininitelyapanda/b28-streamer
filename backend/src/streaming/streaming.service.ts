import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProgressDto } from './dto/streaming.dto';

@Injectable()
export class StreamingService {
  constructor(private prisma: PrismaService) {}

  async getContinueWatching(userId: string) {
    const rows = await this.prisma.watchProgress.findMany({
      where: { userId, progressSeconds: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });
    return rows.map((r) => ({
      videoSlug: r.videoSlug,
      progressSeconds: r.progressSeconds,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async upsertProgress(userId: string, dto: UpsertProgressDto) {
    const row = await this.prisma.watchProgress.upsert({
      where: { userId_videoSlug: { userId, videoSlug: dto.videoSlug } },
      create: {
        userId,
        videoSlug: dto.videoSlug,
        progressSeconds: dto.progressSeconds,
      },
      update: { progressSeconds: dto.progressSeconds },
    });
    return {
      videoSlug: row.videoSlug,
      progressSeconds: row.progressSeconds,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async removeProgress(userId: string, videoSlug: string) {
    try {
      await this.prisma.watchProgress.delete({
        where: { userId_videoSlug: { userId, videoSlug } },
      });
    } catch {
      throw new NotFoundException({ code: 'PROGRESS_NOT_FOUND', message: 'Continue watching entry not found.' });
    }
    return { message: 'Removed from continue watching.' };
  }

  async getWatchlist(userId: string) {
    const rows = await this.prisma.watchlistItem.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });
    return rows.map((r) => ({
      videoSlug: r.videoSlug,
      addedAt: r.addedAt.toISOString(),
    }));
  }

  async addToWatchlist(userId: string, videoSlug: string) {
    await this.prisma.watchlistItem.upsert({
      where: { userId_videoSlug: { userId, videoSlug } },
      create: { userId, videoSlug },
      update: {},
    });
    return { videoSlug, saved: true };
  }

  async removeFromWatchlist(userId: string, videoSlug: string) {
    try {
      await this.prisma.watchlistItem.delete({
        where: { userId_videoSlug: { userId, videoSlug } },
      });
    } catch {
      throw new NotFoundException({ code: 'WATCHLIST_NOT_FOUND', message: 'Watchlist item not found.' });
    }
    return { message: 'Removed from watch later.' };
  }

  async toggleWatchlist(userId: string, videoSlug: string) {
    const existing = await this.prisma.watchlistItem.findUnique({
      where: { userId_videoSlug: { userId, videoSlug } },
    });
    if (existing) {
      await this.prisma.watchlistItem.delete({
        where: { userId_videoSlug: { userId, videoSlug } },
      });
      return { videoSlug, saved: false };
    }
    await this.prisma.watchlistItem.create({ data: { userId, videoSlug } });
    return { videoSlug, saved: true };
  }
}
