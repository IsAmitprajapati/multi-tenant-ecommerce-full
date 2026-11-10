import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { PermissionLevel } from '../generated/prisma/enums.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './permissions.guard.js';
import { type PermissionModule } from './permissions.constants.js';

export const PERMISSION_KEY = 'required_permission';

export interface RequiredPermission {
  module: PermissionModule;
  level: PermissionLevel;
}

/**
 * Protects a route (or whole controller) with JWT auth + a module permission.
 *
 * @example
 *   @RequirePermission('USERS_PERMISSIONS', 'EDIT')
 */
export function RequirePermission(module: PermissionModule, level: PermissionLevel = 'VIEW') {
  return applyDecorators(
    SetMetadata(PERMISSION_KEY, { module, level } satisfies RequiredPermission),
    UseGuards(JwtAuthGuard, PermissionsGuard),
  );
}
