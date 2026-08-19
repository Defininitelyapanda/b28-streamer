import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AdminFilmmakersController } from './admin-filmmakers.controller';
import { FilmmakersController } from './filmmakers.controller';
import { FilmmakersService } from './filmmakers.service';

@Module({
  imports: [UsersModule],
  controllers: [FilmmakersController, AdminFilmmakersController],
  providers: [FilmmakersService],
  exports: [FilmmakersService],
})
export class FilmmakersModule {}
