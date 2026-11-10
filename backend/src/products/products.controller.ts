import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import {
  CreateProductDto, ListProductsQueryDto, ProductStatusDto, SlugCheckQueryDto, StockAdjustmentDto, UpdateProductDto,
} from './dto/product.dto.js';
import { SellerUserGuard } from '../sellers/seller-portal.controller.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';

/** The signed-in seller's catalog (seller admin app) — gated by SELLER_PRODUCTS */
@Controller('seller-portal')
@UseGuards(JwtAuthGuard, SellerUserGuard)
export class ProductsController {
  constructor(private readonly products: ProductsService) { }

  /** Categories, tax classes, brands, package types, delivery scopes, stock reasons */
  @Get('catalog-meta')
  @RequirePermission('SELLER_PRODUCTS', 'VIEW')
  meta(@CurrentUser() user: JwtAccessPayload) {
    return this.products.meta(user.userId);
  }

  @Get('products')
  @RequirePermission('SELLER_PRODUCTS', 'VIEW')
  list(@CurrentUser() user: JwtAccessPayload, @Query() query: ListProductsQueryDto) {
    return this.products.list(user.userId, query);
  }

  @Get('products/slug-availability')
  @RequirePermission('SELLER_PRODUCTS', 'EDIT')
  slugAvailability(@CurrentUser() user: JwtAccessPayload, @Query() query: SlugCheckQueryDto) {
    return this.products.slugAvailability(user.userId, query.slug, query.excludeId);
  }

  @Get('products/:id')
  @RequirePermission('SELLER_PRODUCTS', 'VIEW')
  get(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.products.get(user.userId, id);
  }

  @Post('products')
  @RequirePermission('SELLER_PRODUCTS', 'EDIT')
  create(@CurrentUser() user: JwtAccessPayload, @Body() dto: CreateProductDto) {
    return this.products.create(user.userId, dto);
  }

  @Patch('products/:id')
  @RequirePermission('SELLER_PRODUCTS', 'EDIT')
  update(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.products.update(user.userId, id, dto);
  }

  @Patch('products/:id/status')
  @RequirePermission('SELLER_PRODUCTS', 'EDIT')
  setStatus(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: ProductStatusDto) {
    return this.products.setStatus(user.userId, id, dto.status);
  }

  @Post('products/:id/stock-adjustments')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('SELLER_PRODUCTS', 'EDIT')
  adjustStock(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: StockAdjustmentDto) {
    return this.products.adjustStock(user.userId, id, dto);
  }

  @Delete('products/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('SELLER_PRODUCTS', 'MANAGE')
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.products.remove(user.userId, id);
  }
}
