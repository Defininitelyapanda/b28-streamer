import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuditAction, RequirePermissions } from '../common/decorators/auth.decorators';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AuditService } from '../audit/audit.service';
import { AssignRolesDto, UpdateUserStatusDto } from '../users/dto/users.dto';
import { UsersService } from '../users/users.service';

@ApiTags('admin-users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/v1/admin/users')
export class AdminUsersController {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  @RequirePermissions('users.read')
  @Get()
  list(@Query('page') page = '1', @Query('limit') limit = '20') {
    return this.usersService.listUsers(Number(page), Number(limit));
  }

  @RequirePermissions('users.read')
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @RequirePermissions('users.suspend')
  @AuditAction('SUSPEND_USER', 'user')
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @Req() req: Request,
  ) {
    const result = await this.usersService.updateUserStatus(id, dto.status);
    await this.auditService.logFromRequest(req, {
      action: dto.status === 'SUSPENDED' ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      resource: 'user',
      resourceId: id,
      before: result.before,
      after: result.after,
    });
    return result.after;
  }

  @RequirePermissions('users.write')
  @AuditAction('ASSIGN_USER_ROLES', 'user')
  @Post(':id/roles')
  async assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
    @Req() req: Request,
  ) {
    const result = await this.usersService.assignRoles(id, dto.roles);
    await this.auditService.logFromRequest(req, {
      action: 'ASSIGN_USER_ROLES',
      resource: 'user',
      resourceId: id,
      before: result.before,
      after: result.after,
    });
    return result.after;
  }
}
