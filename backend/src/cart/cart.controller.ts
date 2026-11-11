import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { CartService } from './cart.service.js';
import { AddToCartDto, GuestCartDto, UpdateCartItemDto } from './dto/cart.dto.js';

/** Signed-in shopper's cart */
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) { }

  @Get()
  get(@CurrentUser() user: JwtAccessPayload) { return this.cart.get(user); }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  add(@CurrentUser() user: JwtAccessPayload, @Body() dto: AddToCartDto) { return this.cart.add(user, dto); }

  @Patch('items/:id')
  update(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: UpdateCartItemDto) { return this.cart.update(user, id, dto); }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) { return this.cart.remove(user, id); }

  /** Called right after login/sign-up with the guest cart from the browser */
  @Post('merge')
  @HttpCode(HttpStatus.OK)
  merge(@CurrentUser() user: JwtAccessPayload, @Body() dto: GuestCartDto) { return this.cart.merge(user, dto.items); }
}

/** Guests: price the cart kept in the browser (nothing stored) */
@Controller('public/cart')
export class PublicCartController {
  constructor(private readonly cart: CartService) { }

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  quote(@Body() dto: GuestCartDto) { return this.cart.quoteGuest(dto.items); }
}
