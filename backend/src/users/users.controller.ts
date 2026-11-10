import { Controller, Get, Post, Body, Patch, Param, HttpCode, HttpStatus, Put, UseGuards, Query } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import {
  AdminCreateUserDto,
  AdminUpdateUserDto,
  AssignRoleDto,
  ListAdminUsersQueryDto,
  UpdateUserStatusDto,
} from './dto/admin-user.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async Update(@CurrentUser() user: JwtAccessPayload, @Body() data: UpdateUserDto) {
    return this.usersService.update(user?.userId, data)
  }

  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async ChangePassword(@CurrentUser() user: JwtAccessPayload, @Body() data: UpdateUserDto) {
    return this.usersService.changePassword(user?.userId, data)
  }

  /****Admin users management */
  @Get('/admin')
  @RequirePermission('USERS_PERMISSIONS', 'VIEW')
  async getAdminUsers(@Query() query: ListAdminUsersQueryDto) {
    return this.usersService.getAdminUsers(query)
  }

  @Post('/admin')
  @RequirePermission('USERS_PERMISSIONS', 'EDIT')
  async createAdminUser(@Body() dto: AdminCreateUserDto) {
    return this.usersService.createAdminUser(dto)
  }

  @Patch('/admin/:id')
  @RequirePermission('USERS_PERMISSIONS', 'EDIT')
  async updateAdminUser(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    return this.usersService.updateAdminUser(user.userId, id, dto)
  }

  @Patch('/admin/:id/role')
  @RequirePermission('USERS_PERMISSIONS', 'EDIT')
  async assignRole(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(user.userId, id, dto.roleId)
  }

  @Patch('/admin/:id/status')
  @RequirePermission('USERS_PERMISSIONS', 'EDIT')
  async updateStatus(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateAdminStatus(user.userId, id, dto.status)
  }
}
