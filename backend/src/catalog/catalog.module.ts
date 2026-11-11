import { Module } from '@nestjs/common';
import { CategoriesController, PublicCatalogController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { SellersModule } from '../sellers/sellers.module.js';

@Module({
  imports: [SellersModule],
  controllers: [CategoriesController, PublicCatalogController],
  providers: [CategoriesService],
})
export class CatalogModule { }
