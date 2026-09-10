import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersModule } from '../users/users.module.js';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy.js';

@Module({
  imports : [
      UsersModule,
      JwtModule.register({})
  ],
  controllers: [AuthController],
  providers: [AuthService,JwtStrategy],
  exports : [AuthService]
})
export class AuthModule {}
