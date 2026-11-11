import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller.js';
import { CustomersService } from './customers.service.js';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
