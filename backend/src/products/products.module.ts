import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { SellersModule } from '../sellers/sellers.module.js';

@Module({
  imports: [SellersModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  // Orders/checkout will use ProductsService.markOrdered
  exports: [ProductsService],
})
export class ProductsModule { }
