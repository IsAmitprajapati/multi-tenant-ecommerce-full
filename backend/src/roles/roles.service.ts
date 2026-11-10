import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { RoleStatus, UserType } from '../generated/prisma/enums.js';
import { CreateRoleDto, ListRolesQueryDto, RolePermissionDto, UpdateRoleDto } from './dto/role.dto.js';
import { moduleKeysForUserType, PERMISSION_MODULES } from '../permissions/permissions.constants.js';

const roleSelect = {
  id: true,
  name: true,
  description: true,
  isSystem: true,
  userType: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  permissions: { select: { module: true, level: true } },
  _count: { select: { users: true } },
} satisfies Prisma.RoleSelect;

type RoleRow = Prisma.RoleGetPayload<{ select: typeof roleSelect }>;

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) { }

  /** Shape a DB row for the API: one entry per module the role's user type can have + user count. */
  private serialize(role: RoleRow) {
    const byModule = new Map(role.permissions.map((p) => [p.module, p.level]));
    const { _count, permissions, ...rest } = role;
    return {
      ...rest,
      usersCount: _count.users,
      permissions: moduleKeysForUserType(role.userType).map((module) => ({
        module,
        level: role.isSystem ? 'MANAGE' : (byModule.get(module) ?? 'NONE'),
      })),
    };
  }

  /** One row per module valid for the user type; modules from other panels are dropped. */
  private normalizePermissions(userType: UserType, perms: RolePermissionDto[] = []) {
    const byModule = new Map(perms.map((p) => [p.module, p.level]));
    return moduleKeysForUserType(userType).map((module) => ({ module, level: byModule.get(module) ?? 'NONE' }));
  }

  private async assertNameAvailable(name: string, exceptId?: string) {
    const existing = await this.prisma.role.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, ...(exceptId && { NOT: { id: exceptId } }) },
      select: { id: true },
    });
    if (existing) throw new ConflictException(`A role named "${name}" already exists`);
  }

  getModules() {
    return { data: PERMISSION_MODULES };
  }

  async findAll(query: ListRolesQueryDto) {
    const roles = await this.prisma.role.findMany({
      where: {
        // Customers aren't managed from Users & permissions
        userType: { not: 'CUSTOMER' },
        ...(query.search && { name: { contains: query.search, mode: 'insensitive' } }),
        ...(query.status && { status: query.status }),
      },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
      select: roleSelect,
    });

    return { data: roles.map((r) => this.serialize(r)), message: 'Roles fetched successfully' };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id }, select: roleSelect });
    if (!role || role.userType === 'CUSTOMER') throw new NotFoundException('Role not found');
    return { data: this.serialize(role) };
  }

  /** userType is detected from the admin creating the role, never sent by the client. */
  async create(dto: CreateRoleDto, userType: UserType) {
    const name = dto.name.trim();
    await this.assertNameAvailable(name);

    const role = await this.prisma.role.create({
      data: {
        name,
        description: dto.description?.trim() || null,
        userType,
        permissions: { create: this.normalizePermissions(userType, dto.permissions) },
      },
      select: roleSelect,
    });

    return { success: true, message: 'Role created successfully', data: this.serialize(role) };
  }

  async update(id: string, dto: UpdateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) throw new ForbiddenException('System roles cannot be modified');

    const name = dto.name?.trim();
    if (name) await this.assertNameAvailable(name, id);

    const role = await this.prisma.$transaction(async (tx) => {
      if (dto.permissions) {
        for (const p of this.normalizePermissions(existing.userType, dto.permissions)) {
          await tx.rolePermission.upsert({
            where: { roleId_module: { roleId: id, module: p.module } },
            update: { level: p.level },
            create: { roleId: id, module: p.module, level: p.level },
          });
        }
      }
      return tx.role.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        },
        select: roleSelect,
      });
    });

    return { success: true, message: 'Role updated successfully', data: this.serialize(role) };
  }

  async updateStatus(id: string, status: RoleStatus) {
    const existing = await this.prisma.role.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) throw new ForbiddenException('System roles cannot be deactivated');

    const role = await this.prisma.role.update({ where: { id }, data: { status }, select: roleSelect });
    return {
      success: true,
      message: `Role ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`,
      data: this.serialize(role),
    };
  }

  async remove(id: string) {
    const existing = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!existing) throw new NotFoundException('Role not found');
    if (existing.isSystem) throw new ForbiddenException('System roles cannot be deleted');
    if (existing._count.users > 0) {
      throw new BadRequestException(
        `This role is assigned to ${existing._count.users} user(s). Reassign them before deleting.`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    return { success: true, message: 'Role deleted successfully' };
  }
}
