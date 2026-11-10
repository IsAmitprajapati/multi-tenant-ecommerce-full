import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { CreateRoleDto, ListRolesQueryDto, UpdateRoleDto, UpdateRoleStatusDto } from './dto/role.dto.js';
import { RequirePermission } from '../permissions/require-permission.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  /** Module catalogue used to render the permission matrix. */
  @Get('modules')
  @RequirePermission('USERS_PERMISSIONS', 'VIEW')
  modules() {
    return this.rolesService.getModules();
  }

  @Get()
  @RequirePermission('USERS_PERMISSIONS', 'VIEW')
  findAll(@Query() query: ListRolesQueryDto) {
    return this.rolesService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('USERS_PERMISSIONS', 'VIEW')
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @RequirePermission('USERS_PERMISSIONS', 'MANAGE')
  create(@CurrentUser() user: JwtAccessPayload, @Body() dto: CreateRoleDto) {
    // Role type follows the panel it's created from (platform admin → platform role)
    return this.rolesService.create(dto, user.userType);
  }

  @Patch(':id')
  @RequirePermission('USERS_PERMISSIONS', 'MANAGE')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('USERS_PERMISSIONS', 'MANAGE')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRoleStatusDto) {
    return this.rolesService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('USERS_PERMISSIONS', 'MANAGE')
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
