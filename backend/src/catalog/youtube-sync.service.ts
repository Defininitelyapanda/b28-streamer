import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlaybackFormat, VideoAccessTier } from '@prisma/client';
import { CatalogService } from './catalog.service';
import { UpsertCatalogVideoDto } from './dto/catalog.dto';

interface YouTubePlaylistItem {
  snippet?: {
    resourceId?: { videoId?: string };
  };
}

interface YouTubeVideoItem {
  id?: string;
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
    };
  };
}

function stableRating(videoId: string): string {
  let hash = 0;
  for (let i = 0; i < videoId.length; i++) {
    hash = (hash * 31 + videoId.charCodeAt(i)) >>> 0;
  }
  return (7 + (hash % 20) / 10).toFixed(1);
}

function classifyVideo(input: { title: string; desc: string; videoId: string }) {
  const text = `${input.title} ${input.desc}`.toLowerCase();
  let genre = 'Drama';
  if (/action|fight|battle/.test(text)) genre = 'Action';
  else if (/thriller|suspense|mystery/.test(text)) genre = 'Thriller';
  else if (/horror|scary|ghost/.test(text)) genre = 'Horror';
  else if (/popular|trending|viral/.test(text)) genre = 'Popular';

  const type = /trailer|teaser|preview/.test(text) ? 'trailer' : 'film';
  const seriesGroup = input.title.split('|')[0].trim();

  return { genre, type, seriesGroup };
}

@Injectable()
export class YoutubeSyncService {
  private readonly logger = new Logger(YoutubeSyncService.name);

  constructor(
    private config: ConfigService,
    private catalogService: CatalogService,
  ) {}

  async syncFromChannel(): Promise<{ count: number; syncedAt: string }> {
    const apiKey = this.config.get<string>('YOUTUBE_API_KEY');
    const channelId = this.config.get<string>('YOUTUBE_CHANNEL_ID');
    if (!apiKey || !channelId) {
      throw new ServiceUnavailableException({
        code: 'YOUTUBE_NOT_CONFIGURED',
        message: 'YouTube sync is not configured.',
      });
    }

    const uploadsPlaylistId = await this.getUploadsPlaylistId(apiKey, channelId);
    const videoIds = await this.fetchAllPlaylistVideoIds(apiKey, uploadsPlaylistId);
    if (!videoIds.length) {
      throw new BadRequestException({
        code: 'YOUTUBE_NO_VIDEOS',
        message: 'No videos found on the configured YouTube channel.',
      });
    }

    const videos = await this.fetchVideoDetails(apiKey, videoIds);
    const dtos: UpsertCatalogVideoDto[] = videos.map((v) => ({
      slug: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail,
      date: v.date,
      genre: v.genre,
      description: v.desc,
      rating: v.rating,
      sourceType: 'youtube',
      videoId: v.videoId,
      type: v.type,
      seriesGroup: v.seriesGroup,
      accessTier: VideoAccessTier.FREE,
      playbackFormat: PlaybackFormat.YOUTUBE,
      published: true,
    }));

    const result = await this.catalogService.bulkUpsert(dtos);
    this.logger.log(`Synced ${result.count} videos from YouTube`);
    return result;
  }

  private async youtubeFetch<T>(apiKey: string, endpoint: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
    url.searchParams.set('key', apiKey);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new BadGatewayException({
        code: 'YOUTUBE_API_ERROR',
        message: `YouTube API error (${res.status}): ${text.slice(0, 200)}`,
      });
    }
    return res.json() as Promise<T>;
  }

  private async getUploadsPlaylistId(apiKey: string, channelId: string): Promise<string> {
    const data = await this.youtubeFetch<{ items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> }>(
      apiKey,
      'channels',
      { part: 'contentDetails', id: channelId },
    );
    const playlistId = data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!playlistId) {
      throw new BadGatewayException({
        code: 'YOUTUBE_API_ERROR',
        message: 'Could not resolve uploads playlist for the configured channel.',
      });
    }
    return playlistId;
  }

  private async fetchAllPlaylistVideoIds(apiKey: string, playlistId: string): Promise<string[]> {
    const ids: string[] = [];
    let pageToken: string | undefined;

    do {
      const params: Record<string, string> = {
        part: 'snippet',
        playlistId,
        maxResults: '50',
      };
      if (pageToken) params.pageToken = pageToken;

      const data = await this.youtubeFetch<{ items?: YouTubePlaylistItem[]; nextPageToken?: string }>(
        apiKey,
        'playlistItems',
        params,
      );
      for (const item of data.items ?? []) {
        const id = item.snippet?.resourceId?.videoId;
        if (id) ids.push(id);
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return ids;
  }

  private async fetchVideoDetails(
    apiKey: string,
    videoIds: string[],
  ): Promise<
    Array<{
      videoId: string;
      title: string;
      desc: string;
      date: string;
      thumbnail: string;
      rating: string;
      genre: string;
      type: string;
      seriesGroup: string;
    }>
  > {
    const videos: Array<{
      videoId: string;
      title: string;
      desc: string;
      date: string;
      thumbnail: string;
      rating: string;
      genre: string;
      type: string;
      seriesGroup: string;
    }> = [];

    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const data = await this.youtubeFetch<{ items?: YouTubeVideoItem[] }>(apiKey, 'videos', {
        part: 'snippet',
        id: batch.join(','),
      });

      for (const item of data.items ?? []) {
        const videoId = item.id;
        if (!videoId) continue;

        const snippet = item.snippet;
        const title = snippet?.title ?? 'Untitled';
        const desc = snippet?.description ?? 'No description available.';
        const date = (snippet?.publishedAt ?? new Date().toISOString()).slice(0, 10);
        const thumbnail =
          snippet?.thumbnails?.maxres?.url ??
          snippet?.thumbnails?.high?.url ??
          snippet?.thumbnails?.medium?.url ??
          `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        const classification = classifyVideo({ title, desc, videoId });

        videos.push({
          videoId,
          title,
          desc: desc.slice(0, 500),
          date,
          thumbnail,
          rating: stableRating(videoId),
          ...classification,
        });
      }
    }

    return videos.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
}
