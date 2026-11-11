import { Module } from '@nestjs/common';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

@Module({
  controllers: [AccountController],
  providers: [AccountService],
})
export class AccountModule { }
