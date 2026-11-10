import { Module } from '@nestjs/common';
import { CategoriesController, PublicCatalogController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

@Module({
  controllers: [CategoriesController, PublicCatalogController],
  providers: [CategoriesService],
})
export class CatalogModule { }
