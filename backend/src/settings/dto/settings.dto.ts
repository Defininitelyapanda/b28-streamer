import { Allow, IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  value!: string;
}

export class UpsertSettingDto {
  @IsString()
  key!: string;

  @Allow()
  value!: unknown;

  @IsString()
  type!: string;
}

export class UpdateFeatureFlagDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}
