import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { AccountService } from './account.service.js';
import { AddressDto, NotificationPrefsDto, NotificationsQueryDto } from './dto/account.dto.js';

/** Storefront My account (shopper accounts only) */
@Controller('account')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) { }

  @Get('addresses')
  addresses(@CurrentUser() u: JwtAccessPayload) { return this.account.addresses(u); }

  @Post('addresses')
  addAddress(@CurrentUser() u: JwtAccessPayload, @Body() dto: AddressDto) { return this.account.addAddress(u, dto); }

  @Put('addresses/:id')
  updateAddress(@CurrentUser() u: JwtAccessPayload, @Param('id') id: string, @Body() dto: AddressDto) { return this.account.updateAddress(u, id, dto); }

  @Patch('addresses/:id/default')
  setDefault(@CurrentUser() u: JwtAccessPayload, @Param('id') id: string) { return this.account.setDefault(u, id); }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.OK)
  removeAddress(@CurrentUser() u: JwtAccessPayload, @Param('id') id: string) { return this.account.removeAddress(u, id); }

  @Get('notifications')
  notifications(@CurrentUser() u: JwtAccessPayload, @Query() q: NotificationsQueryDto) { return this.account.notificationsList(u, q.category); }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@CurrentUser() u: JwtAccessPayload) { return this.account.markAllRead(u); }

  @Patch('notifications/:id/read')
  read(@CurrentUser() u: JwtAccessPayload, @Param('id') id: string) { return this.account.markRead(u, id); }

  @Get('notification-settings')
  prefs(@CurrentUser() u: JwtAccessPayload) { return this.account.notificationPrefs(u); }

  @Put('notification-settings')
  savePrefs(@CurrentUser() u: JwtAccessPayload, @Body() dto: NotificationPrefsDto) { return this.account.saveNotificationPrefs(u, dto); }
}
