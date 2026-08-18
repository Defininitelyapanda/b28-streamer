import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertProgressDto {
  @IsString()
  videoSlug!: string;

  @IsInt()
  @Min(0)
  progressSeconds!: number;
}

export class WatchlistDto {
  @IsString()
  videoSlug!: string;
}

export class RemoveProgressDto {
  @IsOptional()
  @IsString()
  videoSlug?: string;
}
