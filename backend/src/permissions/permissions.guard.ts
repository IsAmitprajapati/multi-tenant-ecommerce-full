import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PERMISSION_KEY, type RequiredPermission } from './require-permission.decorator.js';
import { PermissionsService } from './permissions.service.js';
import { hasLevel, PERMISSION_MODULES } from './permissions.constants.js';
import { type JwtAccessPayload } from '../auth/types/jwt-payload.type.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<RequiredPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtAccessPayload | undefined;
    if (!user?.userId) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    const access = await this.permissionsService.getEffectiveAccess(user.userId);

    if (!hasLevel(access.permissions[required.module], required.level)) {
      const label = PERMISSION_MODULES.find((m) => m.key === required.module)?.label ?? required.module;
      throw new ForbiddenException(`You need ${required.level.toLowerCase()} access to ${label}`);
    }

    return true;
  }
}
