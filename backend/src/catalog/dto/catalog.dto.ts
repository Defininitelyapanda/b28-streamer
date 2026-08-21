import { PlaybackFormat, VideoAccessTier } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export const CATALOG_ASSET_KINDS = ['thumbnail', 'poster', 'film', 'trailer'] as const;
export type CatalogAssetKind = (typeof CATALOG_ASSET_KINDS)[number];

export class UpsertCatalogVideoDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  thumbnail!: string;

  @IsString()
  date!: string;

  @IsString()
  genre!: string;

  @IsString()
  description!: string;

  @IsString()
  rating!: string;

  @IsString()
  sourceType!: string;

  @IsString()
  videoId!: string;

  @IsString()
  type!: string;

  @IsString()
  seriesGroup!: string;

  @IsOptional()
  @IsEnum(VideoAccessTier)
  accessTier?: VideoAccessTier;

  @IsOptional()
  @IsEnum(PlaybackFormat)
  playbackFormat?: PlaybackFormat;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class UpdateCatalogVideoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  genre?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rating?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  seriesGroup?: string;

  @IsOptional()
  @IsString()
  sourceType?: string;

  @IsOptional()
  @IsString()
  videoId?: string;

  @IsOptional()
  @IsEnum(VideoAccessTier)
  accessTier?: VideoAccessTier;

  @IsOptional()
  @IsEnum(PlaybackFormat)
  playbackFormat?: PlaybackFormat;

  @IsOptional()
  @IsString()
  storageKey?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  posterUrl?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}

export class PresignUploadDto {
  @IsString()
  slug!: string;

  @IsString()
  contentType!: string;

  @IsIn(CATALOG_ASSET_KINDS)
  assetKind!: CatalogAssetKind;

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class PublishTitleBundleDto {
  @IsString()
  slug!: string;

  @IsString()
  title!: string;

  @IsString()
  date!: string;

  @IsString()
  genre!: string;

  @IsString()
  description!: string;

  @IsString()
  rating!: string;

  @IsString()
  thumbnailKey!: string;

  @IsOptional()
  @IsString()
  posterKey?: string;

  @IsString()
  filmStorageKey!: string;

  @IsOptional()
  @IsString()
  trailerStorageKey?: string;

  @IsOptional()
  @IsEnum(VideoAccessTier)
  accessTier?: VideoAccessTier;

  @IsOptional()
  @IsEnum(PlaybackFormat)
  playbackFormat?: PlaybackFormat;

  @IsOptional()
  @IsString()
  seriesGroup?: string;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
