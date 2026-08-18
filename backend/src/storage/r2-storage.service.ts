import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class R2StorageService {
  private client: S3Client | null = null;
  private bucket: string | null = null;

  constructor(private config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET_NAME');

    if (accountId && accessKeyId && secretAccessKey && bucket) {
      this.bucket = bucket;
      this.client = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      });
    }
  }

  isConfigured(): boolean {
    return Boolean(this.client && this.bucket);
  }

  getPresignedUploadUrl(key: string, contentType: string, ttlSeconds = 3600) {
    this.ensureConfigured();
    const command = new PutObjectCommand({
      Bucket: this.bucket!,
      Key: key,
      ContentType: contentType,
    });
    return getSignedUrl(this.client!, command, { expiresIn: ttlSeconds }).then((url) => ({
      url,
      key,
      expiresIn: ttlSeconds,
    }));
  }

  getPresignedPlaybackUrl(key: string, ttlSeconds = 900) {
    this.ensureConfigured();
    const command = new GetObjectCommand({
      Bucket: this.bucket!,
      Key: key,
    });
    return getSignedUrl(this.client!, command, { expiresIn: ttlSeconds }).then((url) => ({
      url,
      expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    }));
  }

  private ensureConfigured() {
    if (!this.client || !this.bucket) {
      throw new ServiceUnavailableException({
        code: 'R2_NOT_CONFIGURED',
        message: 'Cloudflare R2 storage is not configured.',
      });
    }
  }
}
