import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';
import { SellerCustomersController } from './seller-customers.controller.js';
import { SellerCustomersService } from './seller-customers.service.js';

@Module({
  controllers: [CustomersController, SellerCustomersController],
  providers: [CustomersService, SellerCustomersService],
})
export class CustomersModule {}
