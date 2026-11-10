import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { GlobalPassportModule } from './common/passport/passport.module.js';
import { EmailModule } from './email/email.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { RolesModule } from './roles/roles.module.js';

@Module({

  imports: [
    ConfigModule.forRoot({
      isGlobal : true
    }),
    GlobalPassportModule,
    PrismaModule,
    PermissionsModule,
    AuthModule,
    UsersModule,
    EmailModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
