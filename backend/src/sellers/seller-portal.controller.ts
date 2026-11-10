import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, HttpCode, HttpStatus, Injectable, Post, Query, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { SellersService } from './sellers.service.js';
import { SellerApplicationDto, SlugQueryDto, UploadAuthQueryDto } from './dto/seller.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';

/** Only seller accounts may use the seller portal endpoints. */
@Injectable()
export class SellerUserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<Request>().user as JwtAccessPayload | undefined;
    if (user?.userType !== 'SELLER') throw new ForbiddenException('Only seller accounts can do this');
    return true;
  }
}

/**
 * Endpoints used by the seller admin app (self-service onboarding).
 * Platform-admin endpoints for sellers live in SellersController (/sellers).
 */
@Controller('seller-portal')
@UseGuards(JwtAuthGuard, SellerUserGuard)
export class SellerPortalController {
  constructor(private readonly sellersService: SellersService) { }

  /** Categories, business types, brand colors, KYC document list, seller page base URL */
  @Get('meta')
  meta() {
    return this.sellersService.meta();
  }

  @Get('slug-availability')
  slugAvailability(@Query() query: SlugQueryDto) {
    return this.sellersService.slugAvailability(query.slug);
  }

  /** Short-lived credentials so the browser uploads directly to ImageKit */
  @Get('upload-auth')
  uploadAuth(@Query() query: UploadAuthQueryDto) {
    return this.sellersService.uploadAuth(query.kind);
  }

  /** The signed-in seller's application / seller (null before applying) */
  @Get('application')
  getApplication(@CurrentUser() user: JwtAccessPayload) {
    return this.sellersService.getMyApplication(user.userId);
  }

  /** Submit (or re-submit after rejection) the application for platform review */
  @Post('application')
  @HttpCode(HttpStatus.OK)
  submitApplication(@CurrentUser() user: JwtAccessPayload, @Body() dto: SellerApplicationDto) {
    return this.sellersService.submitApplication(user.userId, dto);
  }
}
