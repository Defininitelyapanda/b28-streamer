import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
  @IsBoolean()
  published?: boolean;
}
