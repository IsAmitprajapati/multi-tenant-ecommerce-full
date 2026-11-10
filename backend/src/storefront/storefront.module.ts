import { Module } from '@nestjs/common';
import { SellersModule } from '../sellers/sellers.module.js';
import { PublicStorefrontController, StorefrontAdminController } from './storefront.controller.js';
import { StorefrontService } from './storefront.service.js';

@Module({
  imports: [SellersModule],
  controllers: [StorefrontAdminController, PublicStorefrontController],
  providers: [StorefrontService],
})
export class StorefrontModule { }
