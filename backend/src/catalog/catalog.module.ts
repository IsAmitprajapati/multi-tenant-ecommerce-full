import { Module } from '@nestjs/common';
import { CategoriesController, PublicCatalogController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { SellersModule } from '../sellers/sellers.module.js';
import { CatalogAdminController } from './catalog-admin.controller.js';
import { CatalogAdminService } from './catalog-admin.service.js';

@Module({
  imports: [SellersModule],
  controllers: [CategoriesController, PublicCatalogController, CatalogAdminController],
  providers: [CategoriesService, CatalogAdminService],
})
export class CatalogModule { }
