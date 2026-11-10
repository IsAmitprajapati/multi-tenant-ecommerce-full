import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SellersService } from './sellers.service.js';
import { ListSellersQueryDto, OnboardSellerDto, SellerStatusActionDto, SlugQueryDto, UpdateSellerDto, UploadAuthQueryDto } from './dto/seller.dto.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellersService: SellersService) { }

  /** Categories, business types, brand colors and KYC document list for the wizard */
  @Get('meta')
  @RequirePermission('SELLERS', 'VIEW')
  meta() {
    return this.sellersService.meta();
  }

  /** Short-lived credentials so the browser can upload one file directly to ImageKit */
  @Get('upload-auth')
  @RequirePermission('SELLERS', 'EDIT')
  uploadAuth(@Query() query: UploadAuthQueryDto) {
    return this.sellersService.uploadAuth(query.kind);
  }

  @Get('slug-availability')
  @RequirePermission('SELLERS', 'EDIT')
  slugAvailability(@Query() query: SlugQueryDto) {
    return this.sellersService.slugAvailability(query.slug);
  }

  @Get()
  @RequirePermission('SELLERS', 'VIEW')
  findAll(@Query() query: ListSellersQueryDto) {
    return this.sellersService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('SELLERS', 'VIEW')
  findOne(@Param('id') id: string) {
    return this.sellersService.findOne(id);
  }

  @Get(':id/kyc-documents/:documentId/url')
  @RequirePermission('SELLERS', 'VIEW')
  kycDocumentUrl(@Param('id') id: string, @Param('documentId') documentId: string) {
    return this.sellersService.kycDocumentUrl(id, documentId);
  }

  @Post('onboard')
  @RequirePermission('SELLERS', 'EDIT')
  onboard(@CurrentUser() user: JwtAccessPayload, @Body() dto: OnboardSellerDto) {
    return this.sellersService.onboard(dto, user.userId);
  }

  /** Update business details, owner contact, seller page & branding (commission needs MANAGE) */
  @Patch(':id')
  @RequirePermission('SELLERS', 'EDIT')
  update(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: UpdateSellerDto) {
    return this.sellersService.update(id, dto, user.userId);
  }

  /** APPROVE / REJECT (KYC) and SUSPEND / REACTIVATE */
  @Patch(':id/status')
  @RequirePermission('SELLERS', 'MANAGE')
  changeStatus(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: SellerStatusActionDto) {
    return this.sellersService.changeStatus(id, dto, user.userId);
  }
}
