import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { R2StorageService } from './r2-storage.service';

describe('R2StorageService', () => {
  it('reports not configured when env vars are missing', async () => {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;

    const service = new R2StorageService(config);
    expect(service.isConfigured()).toBe(false);

    expect(() => service.getPresignedUploadUrl('films/test.mp4', 'video/mp4')).toThrow(
      ServiceUnavailableException,
    );
  });

  it('returns presigned upload metadata when configured', async () => {
    const config = {
      get: (key: string) =>
        ({
          R2_ACCOUNT_ID: 'acct',
          R2_ACCESS_KEY_ID: 'key',
          R2_SECRET_ACCESS_KEY: 'secret',
          R2_BUCKET_NAME: 'bucket',
        })[key],
    } as unknown as ConfigService;

    const service = new R2StorageService(config);
    expect(service.isConfigured()).toBe(true);

    const result = await service.getPresignedUploadUrl('films/demo.mp4', 'video/mp4', 60);
    expect(result.key).toBe('films/demo.mp4');
    expect(result.expiresIn).toBe(60);
    expect(result.url).toContain('X-Amz-Algorithm');
  });
});
