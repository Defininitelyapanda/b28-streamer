import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertProgressDto, WatchlistDto } from './dto/streaming.dto';
import { StreamingService } from './streaming.service';

@ApiTags('streaming')
@ApiBearerAuth()
@Controller('api/v1/streaming')
export class StreamingController {
  constructor(private streamingService: StreamingService) {}

  @Get('continue-watching')
  getContinueWatching(@CurrentUser() user: AuthenticatedUser) {
    return this.streamingService.getContinueWatching(user.id);
  }

  @Put('progress')
  upsertProgress(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertProgressDto) {
    return this.streamingService.upsertProgress(user.id, dto);
  }

  @Delete('progress/:videoSlug')
  removeProgress(@CurrentUser() user: AuthenticatedUser, @Param('videoSlug') videoSlug: string) {
    return this.streamingService.removeProgress(user.id, decodeURIComponent(videoSlug));
  }

  @Get('watchlist')
  getWatchlist(@CurrentUser() user: AuthenticatedUser) {
    return this.streamingService.getWatchlist(user.id);
  }

  @Post('watchlist')
  addToWatchlist(@CurrentUser() user: AuthenticatedUser, @Body() dto: WatchlistDto) {
    return this.streamingService.addToWatchlist(user.id, dto.videoSlug);
  }

  @Post('watchlist/toggle')
  toggleWatchlist(@CurrentUser() user: AuthenticatedUser, @Body() dto: WatchlistDto) {
    return this.streamingService.toggleWatchlist(user.id, dto.videoSlug);
  }

  @Delete('watchlist/:videoSlug')
  removeFromWatchlist(@CurrentUser() user: AuthenticatedUser, @Param('videoSlug') videoSlug: string) {
    return this.streamingService.removeFromWatchlist(user.id, decodeURIComponent(videoSlug));
  }
}
