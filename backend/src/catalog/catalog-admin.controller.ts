import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CatalogAdminService } from './catalog-admin.service.js';
import {
  ActiveDto, AttributeDto, BlockProductDto, FlagProductDto, ListBrandsQueryDto, ListPlatformProductsQueryDto,
  TaxClassDto, UpdateAttributeDto, UpdateTaxClassDto,
} from './dto/catalog-admin.dto.js';

/**
 * Platform admin › Global catalog (categories live in CategoriesController).
 * VIEW to see · EDIT to add/change attributes, tax classes, brands and flag listings · MANAGE to take a listing down.
 */
@Controller('catalog')
export class CatalogAdminController {
  constructor(private readonly catalog: CatalogAdminService) {}

  // Attributes
  @Get('attributes')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  attributes() { return this.catalog.attributes(); }

  @Post('attributes')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  createAttribute(@Body() dto: AttributeDto) { return this.catalog.createAttribute(dto); }

  @Patch('attributes/:id')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  updateAttribute(@Param('id') id: string, @Body() dto: UpdateAttributeDto) { return this.catalog.updateAttribute(id, dto); }

  @Patch('attributes/:id/status')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  attributeStatus(@Param('id') id: string, @Body() dto: ActiveDto) { return this.catalog.setAttributeActive(id, dto); }

  // HSN / tax classes
  @Get('tax-classes')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  taxClasses() { return this.catalog.taxClasses(); }

  @Post('tax-classes')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  createTaxClass(@Body() dto: TaxClassDto) { return this.catalog.createTaxClass(dto); }

  @Patch('tax-classes/:id')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  updateTaxClass(@Param('id') id: string, @Body() dto: UpdateTaxClassDto) { return this.catalog.updateTaxClass(id, dto); }

  @Patch('tax-classes/:id/status')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  taxClassStatus(@Param('id') id: string, @Body() dto: ActiveDto) { return this.catalog.setTaxClassActive(id, dto); }

  // Brands
  @Get('brands')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  brands(@Query() q: ListBrandsQueryDto) { return this.catalog.brands(q); }

  @Patch('brands/:id/status')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  brandStatus(@Param('id') id: string, @Body() dto: ActiveDto) { return this.catalog.setBrandActive(id, dto); }

  // Products across every store
  @Get('products/meta')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  productsMeta() { return this.catalog.productsMeta(); }

  @Get('products')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  products(@Query() q: ListPlatformProductsQueryDto) { return this.catalog.products(q); }

  @Get('products/:id')
  @RequirePermission('GLOBAL_CATALOG', 'VIEW')
  product(@Param('id') id: string) { return this.catalog.product(id); }

  @Patch('products/:id/flag')
  @RequirePermission('GLOBAL_CATALOG', 'EDIT')
  flag(@Param('id') id: string, @Body() dto: FlagProductDto) { return this.catalog.flagProduct(id, dto); }

  @Patch('products/:id/block')
  @RequirePermission('GLOBAL_CATALOG', 'MANAGE')
  block(@Param('id') id: string, @Body() dto: BlockProductDto) { return this.catalog.blockProduct(id, dto); }
}
