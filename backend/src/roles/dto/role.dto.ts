import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsEnum, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { PermissionLevel, RoleStatus } from '../../generated/prisma/enums.js';
import { PERMISSION_MODULE_KEYS, type PermissionModule } from '../../permissions/permissions.constants.js';

export class RolePermissionDto {
  @IsIn(PERMISSION_MODULE_KEYS)
  module: PermissionModule;

  @IsEnum(PermissionLevel)
  level: PermissionLevel;
}

export class CreateRoleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsArray()
  @ArrayUnique((p: RolePermissionDto) => p.module)
  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  permissions: RolePermissionDto[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) { }

export class UpdateRoleStatusDto {
  @IsEnum(RoleStatus)
  status: RoleStatus;
}

export class ListRolesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(RoleStatus)
  status?: RoleStatus;

}
