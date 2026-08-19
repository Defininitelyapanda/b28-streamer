import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CatalogService } from './catalog.service';
import { YoutubeSyncService } from './youtube-sync.service';

describe('YoutubeSyncService', () => {
  let service: YoutubeSyncService;
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;
  const catalogService = {
    bulkUpsert: jest.fn(),
  } as unknown as CatalogService;

  beforeEach(() => {
    service = new YoutubeSyncService(config, catalogService);
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('throws ServiceUnavailableException when YouTube is not configured', async () => {
    (config.get as jest.Mock).mockReturnValue(undefined);

    await expect(service.syncFromChannel()).rejects.toThrow(ServiceUnavailableException);
  });

  it('throws BadRequestException when channel has no videos', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'YOUTUBE_API_KEY') return 'test-key';
      if (key === 'YOUTUBE_CHANNEL_ID') return 'channel-id';
      return undefined;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [{ contentDetails: { relatedPlaylists: { uploads: 'playlist-id' } } }],
      }),
    });
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    await expect(service.syncFromChannel()).rejects.toThrow(BadRequestException);
  });

  it('throws BadGatewayException when YouTube API returns an error', async () => {
    (config.get as jest.Mock).mockImplementation((key: string) => {
      if (key === 'YOUTUBE_API_KEY') return 'test-key';
      if (key === 'YOUTUBE_CHANNEL_ID') return 'channel-id';
      return undefined;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'quota exceeded',
    });

    await expect(service.syncFromChannel()).rejects.toThrow(BadGatewayException);
  });
});
