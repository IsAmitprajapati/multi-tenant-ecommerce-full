import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { PermissionLevel } from '../generated/prisma/enums.js';
import { moduleKeysForUserType, PERMISSION_MODULE_KEYS, type PermissionModule } from './permissions.constants.js';

export type PermissionMap = Record<PermissionModule, PermissionLevel>;

export interface EffectiveAccess {
  role: { id: string; name: string; isSystem: boolean; userType: string } | null;
  permissions: PermissionMap;
}

const summary = (r: { id: string; name: string; isSystem: boolean; userType: string }) =>
  ({ id: r.id, name: r.name, isSystem: r.isSystem, userType: r.userType });

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) { }

  emptyMap(level: PermissionLevel = 'NONE'): PermissionMap {
    return Object.fromEntries(PERMISSION_MODULE_KEYS.map((k) => [k, level])) as PermissionMap;
  }

  /**
   * Resolves what a user can actually do right now. Read from the DB on every
   * call so role changes / deactivations take effect without re-login.
   */
  async getEffectiveAccess(userId: string): Promise<EffectiveAccess> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: {
          select: {
            id: true,
            name: true,
            isSystem: true,
            userType: true,
            status: true,
            permissions: { select: { module: true, level: true } },
          },
        },
      },
    });

    const role = user?.role;
    if (!role || role.status !== 'ACTIVE') {
      return { role: role ? summary(role) : null, permissions: this.emptyMap() };
    }

    // Only modules of the role's own panel can ever be granted
    const allowed = new Set<string>(moduleKeysForUserType(role.userType));

    // System role (Platform Admin) always has full access, even for modules added later.
    const permissions = this.emptyMap();
    if (role.isSystem) {
      allowed.forEach((m) => { permissions[m as PermissionModule] = 'MANAGE'; });
      return { role: summary(role), permissions };
    }

    for (const p of role.permissions) {
      if (allowed.has(p.module)) {
        permissions[p.module as PermissionModule] = p.level;
      }
    }

    return { role: summary(role), permissions };
  }
}
