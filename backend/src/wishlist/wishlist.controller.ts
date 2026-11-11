import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { WishlistService } from './wishlist.service.js';
import { ProductIdsDto } from './wishlist.dto.js';

/** Signed-in shopper's wishlist */
@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) { }

  @Get()
  list(@CurrentUser() user: JwtAccessPayload) { return this.wishlist.list(user); }

  @Put(':productId')
  add(@CurrentUser() user: JwtAccessPayload, @Param('productId') productId: string) { return this.wishlist.add(user, productId); }

  @Delete(':productId')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('productId') productId: string) { return this.wishlist.remove(user, productId); }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  merge(@CurrentUser() user: JwtAccessPayload, @Body() dto: ProductIdsDto) { return this.wishlist.merge(user, dto.productIds); }
}

/** Guests: product cards for the wishlist kept in the browser */
@Controller('public/products')
export class PublicProductCardsController {
  constructor(private readonly wishlist: WishlistService) { }

  @Post('cards')
  @HttpCode(HttpStatus.OK)
  cards(@Body() dto: ProductIdsDto) { return this.wishlist.cards(dto.productIds); }
}
