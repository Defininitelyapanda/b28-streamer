import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FilmmakersService } from './filmmakers.service';

@ApiTags('filmmakers')
@ApiBearerAuth()
@Controller('api/v1/filmmakers')
export class FilmmakersController {
  constructor(private filmmakersService: FilmmakersService) {}

  @Get('me/application')
  getMyApplication(@CurrentUser() user: AuthenticatedUser) {
    return this.filmmakersService.getMyApplication(user.id);
  }
}
