import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SellersController } from './sellers.controller.js';
import { SellerPortalController } from './seller-portal.controller.js';
import { SellerTeamController } from './seller-team.controller.js';
import { SellerTeamService } from './seller-team.service.js';
import { SellersService } from './sellers.service.js';
import { ImageKitStorageService } from './imagekit-storage.service.js';
import { EmailModule } from '../email/email.module.js';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [SellersController, SellerPortalController, SellerTeamController],
  providers: [SellersService, ImageKitStorageService, SellerTeamService],
  exports: [SellersService],
})
export class SellersModule { }
