import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { SellerTeamService } from './seller-team.service.js';
import { CreateSellerStaffDto, SellerStaffStatusDto, UpdateSellerStaffDto } from './dto/seller-team.dto.js';
import { SellerUserGuard } from './seller-portal.controller.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';

/** Staff & roles for the signed-in seller (seller admin app) — gated by SELLER_STAFF_ROLES */
@Controller('seller-portal')
@UseGuards(JwtAuthGuard, SellerUserGuard)
export class SellerTeamController {
  constructor(private readonly team: SellerTeamService) { }

  @Get('staff')
  @RequirePermission('SELLER_STAFF_ROLES', 'VIEW')
  listStaff(@CurrentUser() user: JwtAccessPayload) {
    return this.team.listStaff(user.userId);
  }

  @Get('staff/:id')
  @RequirePermission('SELLER_STAFF_ROLES', 'VIEW')
  getStaff(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.team.getStaff(user.userId, id);
  }

  @Post('staff')
  @RequirePermission('SELLER_STAFF_ROLES', 'EDIT')
  createStaff(@CurrentUser() user: JwtAccessPayload, @Body() dto: CreateSellerStaffDto) {
    return this.team.createStaff(user.userId, dto);
  }

  @Patch('staff/:id')
  @RequirePermission('SELLER_STAFF_ROLES', 'EDIT')
  updateStaff(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: UpdateSellerStaffDto) {
    return this.team.updateStaff(user.userId, id, dto);
  }

  @Patch('staff/:id/status')
  @RequirePermission('SELLER_STAFF_ROLES', 'EDIT')
  setStaffStatus(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: SellerStaffStatusDto) {
    return this.team.setStaffStatus(user.userId, id, dto.status);
  }

  @Post('staff/:id/resend-invite')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('SELLER_STAFF_ROLES', 'EDIT')
  resendInvite(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.team.resendInvite(user.userId, id);
  }

  /** Seller roles provided by the platform (read-only here) */
  @Get('roles')
  @RequirePermission('SELLER_STAFF_ROLES', 'VIEW')
  listRoles(@CurrentUser() user: JwtAccessPayload) {
    return this.team.listRoles(user.userId);
  }

  @Get('roles/:id')
  @RequirePermission('SELLER_STAFF_ROLES', 'VIEW')
  getRole(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.team.getRole(user.userId, id);
  }
}
