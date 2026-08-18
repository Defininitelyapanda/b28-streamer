import { Body, Controller, Get, Param, Patch, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuditService } from '../audit/audit.service';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpdateFeatureFlagDto, UpsertSettingDto } from './dto/settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('api/v1')
export class SettingsController {
  constructor(
    private settingsService: SettingsService,
    private auditService: AuditService,
  ) {}

  @Public()
  @Get('feature-flags')
  publicFlags() {
    return this.settingsService.listPublicFeatureFlags();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.read')
  @Get('admin/settings')
  listSettings() {
    return this.settingsService.listSettings();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.read')
  @Get('admin/settings/:key')
  getSetting(@Param('key') key: string) {
    return this.settingsService.getSetting(key);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.write')
  @Put('admin/settings')
  async upsertSetting(
    @Body() dto: UpsertSettingDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const result = await this.settingsService.upsertSetting(dto, user.id);
    await this.settingsService.validateRevenueSplit();
    await this.auditService.logFromRequest(req, {
      action: 'CHANGE_SETTING',
      resource: 'platform_setting',
      resourceId: dto.key,
      before: result.before,
      after: result.after,
    });
    return result.after;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.read')
  @Get('admin/feature-flags')
  listFlags() {
    return this.settingsService.listFeatureFlags();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('settings.write')
  @Patch('admin/feature-flags/:key')
  async updateFlag(
    @Param('key') key: string,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() req: Request,
  ) {
    const result = await this.settingsService.updateFeatureFlag(key, dto);
    await this.auditService.logFromRequest(req, {
      action: 'CHANGE_FEATURE_FLAG',
      resource: 'feature_flag',
      resourceId: key,
      before: result.before,
      after: result.after,
    });
    return result.after;
  }
}
