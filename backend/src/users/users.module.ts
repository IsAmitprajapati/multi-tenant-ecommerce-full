import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports : [
    PrismaModule
  ],
  controllers: [UsersController],
  providers: [UsersService,PrismaService],
  exports : [UsersService]
})
export class UsersModule {}
