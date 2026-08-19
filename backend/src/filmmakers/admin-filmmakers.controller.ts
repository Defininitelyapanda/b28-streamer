import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FilmmakerApplicationStatus } from '@prisma/client';
import { RequirePermissions } from '../common/decorators/auth.decorators';
import { FilmmakersService } from './filmmakers.service';
import { RejectFilmmakerApplicationDto } from './dto/filmmakers.dto';

@ApiTags('admin-filmmakers')
@ApiBearerAuth()
@Controller('api/v1/admin/filmmakers')
export class AdminFilmmakersController {
  constructor(private filmmakersService: FilmmakersService) {}

  @RequirePermissions('users.read')
  @Get('applications')
  listApplications(@Query('status') status?: FilmmakerApplicationStatus) {
    return this.filmmakersService.listApplications(status);
  }

  @RequirePermissions('users.write')
  @Post('applications/:id/approve')
  approve(@Param('id') id: string) {
    return this.filmmakersService.approve(id);
  }

  @RequirePermissions('users.write')
  @Post('applications/:id/reject')
  reject(@Param('id') id: string, @Body() dto: RejectFilmmakerApplicationDto) {
    return this.filmmakersService.reject(id, dto.message);
  }
}
