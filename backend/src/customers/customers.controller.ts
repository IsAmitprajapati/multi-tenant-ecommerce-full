import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CustomersService } from './customers.service.js';
import { CustomerStatusDto, ListCustomersQueryDto, PageQueryDto, UpdateCustomerDto } from './dto/customers.dto.js';

/** Platform admin › Customers (sellers never get these routes — they only view their own buyers) */
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermission('CUSTOMERS', 'VIEW')
  findAll(@Query() query: ListCustomersQueryDto) {
    return this.customers.findAll(query);
  }

  @Get(':id')
  @RequirePermission('CUSTOMERS', 'VIEW')
  findOne(@Param('id') id: string) {
    return this.customers.findOne(id);
  }

  // Full details page tabs
  @Get(':id/cart')
  @RequirePermission('CUSTOMERS', 'VIEW')
  cart(@Param('id') id: string) {
    return this.customers.cart(id);
  }

  @Get(':id/wishlist')
  @RequirePermission('CUSTOMERS', 'VIEW')
  wishlist(@Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.wishlist(id, q);
  }

  @Get(':id/orders')
  @RequirePermission('CUSTOMERS', 'VIEW')
  orders(@Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.orders(id, q);
  }

  @Get(':id/payments')
  @RequirePermission('CUSTOMERS', 'VIEW')
  payments(@Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.payments(id, q);
  }

  @Get(':id/reviews')
  @RequirePermission('CUSTOMERS', 'VIEW')
  reviews(@Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.reviews(id, q);
  }

  @Get(':id/activity')
  @RequirePermission('CUSTOMERS', 'VIEW')
  activity(@Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.activity(id, q);
  }

  @Get(':id/sessions')
  @RequirePermission('CUSTOMERS', 'VIEW')
  sessions(@Param('id') id: string, @Query() q: PageQueryDto) {
    return this.customers.sessions(id, q);
  }

  /** Name, email, phone */
  @Patch(':id')
  @RequirePermission('CUSTOMERS', 'EDIT')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customers.update(id, dto);
  }

  /** DEACTIVATE (signs them out everywhere) / REACTIVATE */
  @Patch(':id/status')
  @RequirePermission('CUSTOMERS', 'MANAGE')
  changeStatus(@Param('id') id: string, @Body() dto: CustomerStatusDto) {
    return this.customers.changeStatus(id, dto);
  }
}
