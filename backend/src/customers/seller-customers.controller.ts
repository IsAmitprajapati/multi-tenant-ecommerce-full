import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { SellerUserGuard } from '../sellers/seller-portal.controller.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { SellerCustomersService } from './seller-customers.service.js';
import { ListCustomersQueryDto, PageQueryDto } from './dto/customers.dto.js';

/**
 * Seller admin › Customers — GET only (SELLER_CUSTOMERS maxes out at VIEW).
 * Only buyers of this seller; only name, order count, total order value and order details.
 */
@Controller('seller-portal/customers')
@UseGuards(JwtAuthGuard, SellerUserGuard)
export class SellerCustomersController {
  constructor(private readonly customers: SellerCustomersService) {}

  @Get()
  @RequirePermission('SELLER_CUSTOMERS', 'VIEW')
  list(@CurrentUser() user: JwtAccessPayload, @Query() q: ListCustomersQueryDto) {
    return this.customers.list(user.userId, q);
  }

  @Get(':id')
  @RequirePermission('SELLER_CUSTOMERS', 'VIEW')
  findOne(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.customers.findOne(user.userId, id);
  }

  @Get(':id/orders')
  @RequirePermission('SELLER_CUSTOMERS', 'VIEW')
  orders(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.orders(user.userId, id, q);
  }
}
