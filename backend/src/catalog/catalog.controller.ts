import { Body, Controller, Delete, Get, Param, Patch, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { CatalogService } from './catalog.service';
import { UpdateCatalogVideoDto, UpsertCatalogVideoDto } from './dto/catalog.dto';

@ApiTags('catalog')
@Controller('api/v1')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  @Public()
  @Get('catalog')
  getPublicCatalog() {
    return this.catalogService.getPublicCatalog();
  }
}

@ApiTags('admin-catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/admin/catalog')
export class AdminCatalogController {
  constructor(private catalogService: CatalogService) {}

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
