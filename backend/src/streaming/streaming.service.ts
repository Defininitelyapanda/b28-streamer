import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PlaybackFormat, VideoAccessTier } from '@prisma/client';
import { CatalogService } from '../catalog/catalog.service';
import { R2StorageService } from '../storage/r2-storage.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertProgressDto } from './dto/streaming.dto';

export interface PlaybackInfo {
  playbackFormat: PlaybackFormat;
  videoId?: string;
  url?: string;
  expiresAt?: string;
  accessTier: VideoAccessTier;
  adsEnabled: boolean;
}

@Injectable()
export class StreamingService {
  constructor(
    private prisma: PrismaService,
    private catalogService: CatalogService,
    private subscriptionsService: SubscriptionsService,
    private r2Storage: R2StorageService,
  ) {}

  async getPlaybackInfo(userId: string | null, slug: string): Promise<PlaybackInfo> {
    const video = await this.catalogService.findBySlug(slug);

    const isFreeYoutube =
      video.accessTier === VideoAccessTier.FREE &&
      video.playbackFormat === PlaybackFormat.YOUTUBE;

    if (!isFreeYoutube) {
      if (!userId) {
        throw new UnauthorizedException({
          code: 'UNAUTHORIZED',
          message: 'Authentication required.',
        });
      }

      if (!(await this.subscriptionsService.canStream(userId))) {
        throw new ForbiddenException({
          code: 'SUBSCRIPTION_REQUIRED',
          message: 'An active subscription is required to stream.',
        });
      }
    }

    if (video.playbackFormat === PlaybackFormat.YOUTUBE) {
      return {
        playbackFormat: PlaybackFormat.YOUTUBE,
        videoId: video.videoId,
        accessTier: video.accessTier,
        adsEnabled: false,
      };
    }

    if (!video.storageKey) {
      throw new NotFoundException({
        code: 'PLAYBACK_UNAVAILABLE',
        message: 'Video file not available.',
      });
    }

    const presigned = await this.r2Storage.getPresignedPlaybackUrl(video.storageKey);
    return {
      playbackFormat: video.playbackFormat,
      url: presigned.url,
      expiresAt: presigned.expiresAt,
      accessTier: video.accessTier,
      adsEnabled: false,
    };
  }

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
      update: {
        progressSeconds: dto.progressSeconds,
      },
    });
    return {
      videoSlug: row.videoSlug,
      progressSeconds: row.progressSeconds,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async removeProgress(userId: string, videoSlug: string) {
    await this.prisma.watchProgress.deleteMany({
      where: { userId, videoSlug },
    });
    return { message: 'Progress removed.' };
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
    return { message: 'Added to watchlist.' };
  }

  async toggleWatchlist(userId: string, videoSlug: string) {
    const existing = await this.prisma.watchlistItem.findUnique({
      where: { userId_videoSlug: { userId, videoSlug } },
    });
    if (existing) {
      await this.prisma.watchlistItem.delete({
        where: { userId_videoSlug: { userId, videoSlug } },
      });
      return { added: false };
    }
    await this.prisma.watchlistItem.create({ data: { userId, videoSlug } });
    return { added: true };
  }

  async removeFromWatchlist(userId: string, videoSlug: string) {
    await this.prisma.watchlistItem.deleteMany({
      where: { userId, videoSlug },
    });
    return { message: 'Removed from watchlist.' };
  }
}
