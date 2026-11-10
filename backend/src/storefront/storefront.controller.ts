import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { StorefrontService } from './storefront.service.js';
import {
  CreateBannerDto, CreateSectionDto, ProductPickerQueryDto, ReorderDto, StorefrontSettingsDto, ToggleDto, UpdateBannerDto, UpdateSectionDto,
} from './dto/storefront.dto.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';

/** Platform admin › Storefront › Home page — gated by STOREFRONT */
@Controller('storefront')
export class StorefrontAdminController {
  constructor(private readonly storefront: StorefrontService) { }

  @Get('settings')
  @RequirePermission('STOREFRONT', 'VIEW')
  settings() { return this.storefront.getSettings(); }

  @Put('settings')
  @RequirePermission('STOREFRONT', 'EDIT')
  updateSettings(@Body() dto: StorefrontSettingsDto) { return this.storefront.updateSettings(dto); }

  @Get('upload-auth')
  @RequirePermission('STOREFRONT', 'EDIT')
  uploadAuth() { return { data: this.storefront.uploadAuth() }; }

  @Get('meta/categories')
  @RequirePermission('STOREFRONT', 'VIEW')
  categoryOptions() { return this.storefront.categoryOptions(); }

  @Get('meta/products')
  @RequirePermission('STOREFRONT', 'VIEW')
  pickProducts(@Query() q: ProductPickerQueryDto) { return this.storefront.pickProducts(q); }

  /** What the live home page currently renders (preview) */
  @Get('preview')
  @RequirePermission('STOREFRONT', 'VIEW')
  preview() { return this.storefront.publicHome(); }

  // Banners
  @Get('banners')
  @RequirePermission('STOREFRONT', 'VIEW')
  banners() { return this.storefront.listBanners(); }

  @Post('banners')
  @RequirePermission('STOREFRONT', 'EDIT')
  createBanner(@Body() dto: CreateBannerDto) { return this.storefront.createBanner(dto); }

  @Put('banners/order')
  @RequirePermission('STOREFRONT', 'EDIT')
  reorderBanners(@Body() dto: ReorderDto) { return this.storefront.reorderBanners(dto.ids); }

  @Patch('banners/:id')
  @RequirePermission('STOREFRONT', 'EDIT')
  updateBanner(@Param('id') id: string, @Body() dto: UpdateBannerDto) { return this.storefront.updateBanner(id, dto); }

  @Patch('banners/:id/status')
  @RequirePermission('STOREFRONT', 'EDIT')
  toggleBanner(@Param('id') id: string, @Body() dto: ToggleDto) { return this.storefront.setBannerActive(id, dto.isActive); }

  @Delete('banners/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('STOREFRONT', 'MANAGE')
  deleteBanner(@Param('id') id: string) { return this.storefront.deleteBanner(id); }

  // Sections
  @Get('sections')
  @RequirePermission('STOREFRONT', 'VIEW')
  sections() { return this.storefront.listSections(); }

  @Get('sections/:id')
  @RequirePermission('STOREFRONT', 'VIEW')
  section(@Param('id') id: string) { return this.storefront.getSection(id); }

  @Post('sections')
  @RequirePermission('STOREFRONT', 'EDIT')
  createSection(@Body() dto: CreateSectionDto) { return this.storefront.createSection(dto); }

  @Put('sections/order')
  @RequirePermission('STOREFRONT', 'EDIT')
  reorderSections(@Body() dto: ReorderDto) { return this.storefront.reorderSections(dto.ids); }

  @Patch('sections/:id')
  @RequirePermission('STOREFRONT', 'EDIT')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSectionDto) { return this.storefront.updateSection(id, dto); }

  @Patch('sections/:id/status')
  @RequirePermission('STOREFRONT', 'EDIT')
  toggleSection(@Param('id') id: string, @Body() dto: ToggleDto) { return this.storefront.setSectionActive(id, dto.isActive); }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('STOREFRONT', 'MANAGE')
  deleteSection(@Param('id') id: string) { return this.storefront.deleteSection(id); }
}

/** No login — consumed by the customer storefront */
@Controller('public')
export class PublicStorefrontController {
  constructor(private readonly storefront: StorefrontService) { }

  @Get('home')
  home() { return this.storefront.publicHome(); }

  @Get('categories')
  categories() { return this.storefront.publicCategories(); }

  @Get('products/:sellerSlug/:slug')
  product(@Param('sellerSlug') sellerSlug: string, @Param('slug') slug: string) {
    return this.storefront.publicProduct(sellerSlug, slug);
  }

  @Get('products')
  products(@Query('category') category?: string, @Query('sort') sort?: string, @Query('q') q?: string) {
    return this.storefront.publicProducts({ category, sort, q: typeof q === 'string' ? q : undefined });
  }
}
