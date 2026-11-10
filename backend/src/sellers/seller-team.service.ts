import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { UserStatus } from '../generated/prisma/enums.js';
import { capLevel, moduleKeysForUserType } from '../permissions/permissions.constants.js';
import { CreateSellerStaffDto, UpdateSellerStaffDto } from './dto/seller-team.dto.js';

const staffSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  status: true,
  createdAt: true,
  role: { select: { id: true, name: true, status: true } },
  sessions: { select: { lastActiveAt: true }, orderBy: { lastActiveAt: 'desc' }, take: 1 },
} satisfies Prisma.UserSelect;

/**
 * Staff & roles for the signed-in seller (seller admin app).
 * Sellers manage their own staff; roles are the shared seller roles provided by the platform.
 */
@Injectable()
export class SellerTeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) { }

  /** The actor's seller — must be approved (ACTIVE) */
  private async context(actorId: string) {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, sellerId: true, seller: { select: { id: true, name: true, status: true, ownerId: true } } },
    });
    if (!actor?.seller) throw new ForbiddenException('You are not part of a seller account');
    if (actor.seller.status !== 'ACTIVE') throw new ForbiddenException('Your seller account is not active yet');
    return { actorId: actor.id, seller: actor.seller };
  }

  private serializeStaff(u: Prisma.UserGetPayload<{ select: typeof staffSelect }>, ownerId: string) {
    const { sessions, ...rest } = u;
    const lastActiveAt = sessions[0]?.lastActiveAt ?? null;
    return {
      ...rest,
      isOwner: u.id === ownerId,
      lastActiveAt,
      /** Never signed in yet → still needs to accept the invite */
      invitePending: !lastActiveAt,
    };
  }

  /** Only shared, active seller roles can be assigned */
  private async assertAssignableRole(roleId: string) {
    const role = await this.prisma.role.findFirst({
      where: { id: roleId, userType: 'SELLER', sellerId: null },
      select: { id: true, name: true, status: true },
    });
    if (!role) throw new BadRequestException('Selected role does not exist');
    if (role.status !== 'ACTIVE') throw new BadRequestException('Selected role is inactive');
    return role;
  }

  private async findStaffOrThrow(sellerId: string, id: string) {
    const user = await this.prisma.user.findFirst({ where: { id, sellerId }, select: { id: true, roleId: true, fullName: true, email: true } });
    if (!user) throw new NotFoundException('Staff member not found');
    return user;
  }

  /* ------------------------------- Staff ------------------------------- */

  async listStaff(actorId: string) {
    const { seller } = await this.context(actorId);
    const staff = await this.prisma.user.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: 'asc' },
      select: staffSelect,
    });
    return { data: staff.map((u) => this.serializeStaff(u, seller.ownerId)) };
  }

  async getStaff(actorId: string, id: string) {
    const { seller } = await this.context(actorId);
    const user = await this.prisma.user.findFirst({ where: { id, sellerId: seller.id }, select: staffSelect });
    if (!user) throw new NotFoundException('Staff member not found');
    return { data: this.serializeStaff(user, seller.ownerId) };
  }

  async createStaff(actorId: string, dto: CreateSellerStaffDto) {
    const { seller } = await this.context(actorId);
    if (await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } })) {
      throw new ConflictException('An account with this email already exists');
    }
    const role = await this.assertAssignableRole(dto.roleId);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        // They set their own password from the invite; this random hash is never shared
        passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
        userType: 'SELLER',
        roleId: role.id,
        sellerId: seller.id,
      },
      select: staffSelect,
    });

    const inviteSent = await this.sendInvite(user.id, user.fullName, user.email, seller.name, role.name);
    return {
      success: true,
      message: inviteSent ? `Invite sent to ${user.email}` : 'Staff added, but the invite email could not be sent',
      data: { ...this.serializeStaff(user, seller.ownerId), inviteSent },
    };
  }

  async updateStaff(actorId: string, id: string, dto: UpdateSellerStaffDto) {
    const { seller } = await this.context(actorId);
    const target = await this.findStaffOrThrow(seller.id, id);

    let roleId: string | undefined;
    if (dto.roleId && dto.roleId !== target.roleId) {
      if (id === actorId) throw new ForbiddenException('You cannot change your own role');
      if (id === seller.ownerId) throw new ForbiddenException('The owner’s role cannot be changed');
      roleId = (await this.assertAssignableRole(dto.roleId)).id;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName && { fullName: dto.fullName }),
        ...(dto.phone !== undefined && { phone: dto.phone || null }),
        ...(roleId && { roleId }),
      },
      select: staffSelect,
    });
    return { success: true, message: 'Staff member updated', data: this.serializeStaff(user, seller.ownerId) };
  }

  async setStaffStatus(actorId: string, id: string, status: UserStatus) {
    const { seller } = await this.context(actorId);
    await this.findStaffOrThrow(seller.id, id);
    if (id === actorId) throw new ForbiddenException('You cannot change your own status');
    if (id === seller.ownerId) throw new ForbiddenException('The owner cannot be deactivated');

    const user = await this.prisma.$transaction(async (tx) => {
      // Sign a deactivated staff member out of every device
      if (status !== 'ACTIVE') {
        await tx.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return tx.user.update({ where: { id }, data: { status }, select: staffSelect });
    });
    return {
      success: true,
      message: status === 'ACTIVE' ? 'Staff member activated' : 'Staff member deactivated',
      data: this.serializeStaff(user, seller.ownerId),
    };
  }

  async resendInvite(actorId: string, id: string) {
    const { seller } = await this.context(actorId);
    const target = await this.findStaffOrThrow(seller.id, id);
    const roleName = (await this.prisma.role.findUnique({ where: { id: target.roleId ?? '' }, select: { name: true } }))?.name ?? 'staff';
    const sent = await this.sendInvite(target.id, target.fullName, target.email, seller.name, roleName);
    if (!sent) throw new BadRequestException('The invite email could not be sent — try again later');
    return { success: true, message: `Invite re-sent to ${target.email}` };
  }

  /* ------------------------------- Roles ------------------------------- */

  private roleSelect(sellerId: string) {
    return {
      id: true, name: true, description: true,
      permissions: { select: { module: true, level: true } },
      _count: { select: { users: { where: { sellerId } } } },
    } satisfies Prisma.RoleSelect;
  }

  private serializeRole(r: { id: string; name: string; description: string | null; permissions: { module: string; level: string }[]; _count: { users: number } }) {
    const byModule = new Map(r.permissions.map((p) => [p.module, p.level]));
    const { _count, permissions, ...rest } = r;
    return {
      ...rest,
      staffCount: _count.users,
      permissions: moduleKeysForUserType('SELLER').map((module) => ({ module, level: capLevel(module, (byModule.get(module) ?? 'NONE') as never) })),
    };
  }

  /** Shared seller roles (read-only for sellers) + how many of this seller's staff have each */
  async listRoles(actorId: string) {
    const { seller } = await this.context(actorId);
    const roles = await this.prisma.role.findMany({
      where: { userType: 'SELLER', sellerId: null, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
      select: this.roleSelect(seller.id),
    });
    return { data: roles.map((r) => this.serializeRole(r)) };
  }

  /** One role + which of this seller's staff have it */
  async getRole(actorId: string, id: string) {
    const { seller } = await this.context(actorId);
    const role = await this.prisma.role.findFirst({
      where: { id, userType: 'SELLER', sellerId: null },
      select: this.roleSelect(seller.id),
    });
    if (!role) throw new NotFoundException('Role not found');
    const staff = await this.prisma.user.findMany({
      where: { sellerId: seller.id, roleId: id },
      orderBy: { createdAt: 'asc' },
      select: staffSelect,
    });
    return { data: { ...this.serializeRole(role), staff: staff.map((u) => this.serializeStaff(u, seller.ownerId)) } };
  }

  /* ------------------------------ Invites ------------------------------ */

  private async sendInvite(userId: string, name: string, email: string, sellerName: string, roleName: string) {
    // Same token the /auth/reset-password endpoint accepts (lands on /auth/set-password)
    const token = await this.jwtService.signAsync(
      { userId },
      { secret: this.config.getOrThrow<string>('JWT_RESET_SECRET'), expiresIn: '7d' },
    );
    const base = (this.config.get<string>('SELLER_ADMIN_URL')?.trim() || 'http://localhost:3001').replace(/\/+$/, '');
    const link = `${base}/auth/set-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
    return this.emailService.sendSellerStaffInvite(name, email, sellerName, roleName, link, '7 days');
  }
}
