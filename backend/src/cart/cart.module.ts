import { Module } from '@nestjs/common';
import { CartController, PublicCartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

@Module({
  controllers: [CartController, PublicCartController],
  providers: [CartService],
  // Checkout will price orders with CartService.quote
  exports: [CartService],
})
export class CartModule { }
