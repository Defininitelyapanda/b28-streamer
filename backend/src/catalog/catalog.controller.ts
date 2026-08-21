import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { R2StorageService } from '../storage/r2-storage.service';
import { CatalogService } from './catalog.service';
import { PresignUploadDto, PublishTitleBundleDto, UpdateCatalogVideoDto, UpsertCatalogVideoDto } from './dto/catalog.dto';
import {
  assertAllowedUploadContentType,
  buildCatalogAssetKey,
} from './catalog-upload.util';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@Controller('api/v1')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Public()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @Get('catalog')
  getCatalog(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('genre') genre?: string,
    @Query('q') q?: string,
  ) {
    return this.catalogService.getPublicCatalog({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      genre,
      q,
    });
  }

  @Public()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
  @Get('catalog/videos/:slug')
  getVideoBySlug(@Param('slug') slug: string) {
    return this.catalogService.getVideoBySlug(decodeURIComponent(slug));
  }

  @Public()
  @Header('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300')
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
    assertAllowedUploadContentType(dto.assetKind, dto.contentType);
    const key = buildCatalogAssetKey(dto.slug, dto.assetKind, dto.contentType, dto.fileName);
    return this.r2Storage.getPresignedUploadUrl(key, dto.contentType).then((result) => ({
      ...result,
      publicUrl:
        dto.assetKind === 'thumbnail' || dto.assetKind === 'poster'
          ? this.r2Storage.getPublicObjectUrl(key)
          : undefined,
    }));
  }

  @RequirePermissions('films.approve')
  @Post('publish-bundle')
  publishBundle(@Body() dto: PublishTitleBundleDto) {
    return this.catalogService.publishTitleBundle(dto, this.r2Storage);
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
