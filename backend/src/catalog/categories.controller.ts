import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';
import { CategoryStatusDto, CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';

/** Platform admin › Global catalog › Categories — gated by GLOBAL_CATALOG */
@Controller('catalog/categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) { }

  @Get()
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  list() {
    return this.categories.list();
  }

  @Get(':id')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  get(@Param('id') id: string) {
    return this.categories.get(id);
  }

  @Post()
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  setStatus(@Param('id') id: string, @Body() dto: CategoryStatusDto) {
    return this.categories.setStatus(id, dto.isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('GLOBAL_CATALOG', 'MANAGE')
  remove(@Param('id') id: string) {
    return this.categories.remove(id);
  }
}

/** No login needed — used by the public seller landing page */
@Controller('public')
export class PublicCatalogController {
  constructor(private readonly categories: CategoriesService) { }

  @Get('seller-categories')
  sellerCategories() {
    return this.categories.publicSellerCategories();
  }
}
