import { Module } from '@nestjs/common';
import { PublicProductCardsController, WishlistController } from './wishlist.controller.js';
import { WishlistService } from './wishlist.service.js';

@Module({
  controllers: [WishlistController, PublicProductCardsController],
  providers: [WishlistService],
})
export class WishlistModule { }
