import { IsIn, IsOptional, IsString } from 'class-validator';
import { FilmmakerApplicationStatus } from '@prisma/client';

export class ListFilmmakerApplicationsDto {
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: FilmmakerApplicationStatus;
}

export class RejectFilmmakerApplicationDto {
  @IsOptional()
  @IsString()
  message?: string;
}
