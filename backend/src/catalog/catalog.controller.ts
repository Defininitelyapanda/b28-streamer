import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { R2StorageService } from '../storage/r2-storage.service';
import { CatalogService } from './catalog.service';
import { PresignUploadDto, UpdateCatalogVideoDto, UpsertCatalogVideoDto } from './dto/catalog.dto';
import { YoutubeSyncService } from './youtube-sync.service';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('api/v1')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Get('catalog')
  getCatalog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('genre') genre?: string,
  ) {
    return this.catalogService.getPublicCatalog({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      genre,
    });
  }

  @Get('catalog/videos/:slug')
  getVideoBySlug(@Param('slug') slug: string) {
    return this.catalogService.getVideoBySlug(decodeURIComponent(slug));
  }

  @Get('catalog/videos/:slug/related')
  getRelatedBySlug(@Param('slug') slug: string, @Query('limit') limit?: string) {
    return this.catalogService.getRelatedBySlug(
      decodeURIComponent(slug),
      limit ? Number(limit) : 12,
    );
  }
}

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/admin/catalog')
export class AdminCatalogController {
  constructor(
    private catalogService: CatalogService,
    private youtubeSync: YoutubeSyncService,
    private r2Storage: R2StorageService,
  ) {}

  @RequirePermissions('films.read')
  @Get()
  listAll() {
    return this.catalogService.listAll();
  }

  @RequirePermissions('films.approve')
  @Put()
  upsert(@Body() dto: UpsertCatalogVideoDto) {
    return this.catalogService.upsert(dto);
  }

  @RequirePermissions('films.approve')
  @Post('upload-url')
  presignUpload(@Body() dto: PresignUploadDto) {
    const key = `films/${dto.slug}/${Date.now()}.mp4`;
    return this.r2Storage.getPresignedUploadUrl(key, dto.contentType);
  }

  @RequirePermissions('films.approve')
  @Post('sync-youtube')
  syncYoutube() {
    return this.youtubeSync.syncFromChannel();
  }

  @Public()
  @Post('internal/sync-youtube')
  syncYoutubeCron(@Headers('x-cron-secret') cronSecret?: string) {
    const expected = process.env.CRON_SECRET;
    if (!expected || cronSecret !== expected) {
      throw new UnauthorizedException({ code: 'UNAUTHORIZED', message: 'Invalid cron secret.' });
    }
    return this.youtubeSync.syncFromChannel();
  }

  @RequirePermissions('films.approve')
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateCatalogVideoDto) {
    return this.catalogService.update(slug, dto);
  }

  @RequirePermissions('films.delete')
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.catalogService.remove(slug);
  }
}
