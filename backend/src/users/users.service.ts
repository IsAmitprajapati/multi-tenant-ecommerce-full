import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import bcrypt from 'bcryptjs';
import { UserStatus } from '../generated/prisma/enums.js';
import { Prisma } from '../generated/prisma/client.js';
import { AdminCreateUserDto, AdminUpdateUserDto, ListAdminUsersQueryDto } from './dto/admin-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  /****Find By User Email */
  findByEmail(email: string) {
    const data = this.prisma.user.findUnique({
      where: {
        email
      }
    })
    return data
  }


  findById(id: string) {
    const data = this.prisma.user.findUnique({
      where: {
        id
      }
    })
    return data
  }

  async update(id: string, data: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: {
        id: id
      },
      data: {
        fullName: data?.fullName,
        email: data?.email,
        phone: data?.phone
      },
      select: {
        fullName: true,
        email: true,
        phone: true,
        id: true
      }
    })
    return {
      success: true,
      message: "Update successfully",
      data: user
    }
  }

  async changePassword(id: string, data: UpdateUserDto) {
    if (!data.password) {
      throw new BadRequestException("Password is required")
    }
    const passswordHash = await bcrypt.hash(data.password!, 10)

    try {
      const user = await this.prisma.user.update({
        where: {
          id: id
        },
        data: {
          passwordUpdatedAt: new Date(),
          passwordHash: passswordHash
        }
      })

      return {
        success: true,
        message: "Password Change successfully"
      }
    } catch (error) {
      throw new BadRequestException("Failed to change password")
    }

  }

  /****Admin users (platform staff) */
  private readonly adminUserSelect = {
    id: true,
    fullName: true,
    email: true,
    status: true,
    phone: true,
    profileImage: true,
    twoFactorEnabled: true,
    createdAt: true,
    updatedAt: true,
    userType: true,
    role: { select: { id: true, name: true, status: true, isSystem: true, userType: true } },
    sessions: {
      select: { lastActiveAt: true },
      orderBy: { lastActiveAt: 'desc' },
      take: 1,
    },
  } satisfies Prisma.UserSelect

  private serializeAdminUser(user: Prisma.UserGetPayload<{ select: UsersService['adminUserSelect'] }>) {
    const { sessions, ...rest } = user
    return { ...rest, lastActiveAt: sessions[0]?.lastActiveAt ?? null }
  }

  private async assertRoleAssignable(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } })
    // A seller's private roles can't be given to platform users
    if (!role || role.sellerId) throw new BadRequestException('Selected role does not exist')
    if (role.status !== 'ACTIVE') throw new BadRequestException('Selected role is inactive')
    if (role.userType === 'CUSTOMER') throw new BadRequestException('Customer roles cannot be assigned here')
    return role
  }

  private async findAdminOrThrow(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } })
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async getAdminUsers(query: ListAdminUsersQueryDto) {
    const users = await this.prisma.user.findMany({
      where: {
        // Platform staff by default; seller users are shown per seller, customers in the Customers module
        userType: query.userType && query.userType !== 'CUSTOMER' ? query.userType : 'PLATFORM_ADMIN',
        ...(query.userId && { id: query.userId }),
        ...(query.roleId && { roleId: query.roleId }),
        ...(query.status && { status: query.status }),
        ...(query.search && {
          OR: [
            { fullName: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { createdAt: 'asc' },
      select: this.adminUserSelect,
    })

    return {
      data: users.map((u) => this.serializeAdminUser(u)),
      message: "Users fetch successfully!"
    }
  }

  async createAdminUser(dto: AdminCreateUserDto) {
    const email = dto.email.trim().toLowerCase()
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('A user with this email already exists')
    }
    const role = await this.assertRoleAssignable(dto.roleId)

    const user = await this.prisma.user.create({
      data: {
        email,
        fullName: dto.fullName.trim(),
        phone: dto.phone?.trim() || null,
        passwordHash: await bcrypt.hash(dto.password, 10),
        userType: role.userType,
        roleId: dto.roleId,
      },
      select: this.adminUserSelect,
    })

    return { success: true, message: 'User created successfully', data: this.serializeAdminUser(user) }
  }

  async updateAdminUser(actorId: string, id: string, dto: AdminUpdateUserDto) {
    const existing = await this.findAdminOrThrow(id)

    const email = dto.email?.trim().toLowerCase()
    if (email && email !== existing.email) {
      if (await this.prisma.user.findUnique({ where: { email } })) {
        throw new ConflictException('A user with this email already exists')
      }
    }

    let newRole: Awaited<ReturnType<UsersService['assertRoleAssignable']>> | null = null
    if (dto.roleId && dto.roleId !== existing.roleId) {
      if (actorId === id) throw new ForbiddenException('You cannot change your own role')
      newRole = await this.assertRoleAssignable(dto.roleId)
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(email && { email }),
        ...(dto.fullName && { fullName: dto.fullName.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
        ...(newRole && { roleId: newRole.id, userType: newRole.userType }),
        ...(dto.password && {
          passwordHash: await bcrypt.hash(dto.password, 10),
          passwordUpdatedAt: new Date(),
        }),
      },
      select: this.adminUserSelect,
    })

    return { success: true, message: 'User updated successfully', data: this.serializeAdminUser(user) }
  }

  async assignRole(actorId: string, id: string, roleId: string) {
    await this.findAdminOrThrow(id)
    if (actorId === id) throw new ForbiddenException('You cannot change your own role')
    const role = await this.assertRoleAssignable(roleId)

    const user = await this.prisma.user.update({
      where: { id },
      data: { roleId, userType: role.userType },
      select: this.adminUserSelect,
    })

    return { success: true, message: `Role "${role.name}" assigned`, data: this.serializeAdminUser(user) }
  }

  async updateAdminStatus(actorId: string, id: string, status: UserStatus) {
    await this.findAdminOrThrow(id)
    if (actorId === id) throw new ForbiddenException('You cannot change your own status')

    const user = await this.prisma.$transaction(async (tx) => {
      // Kick a deactivated user out of every device immediately
      if (status !== 'ACTIVE') {
        await tx.userSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        })
      }
      return tx.user.update({ where: { id }, data: { status }, select: this.adminUserSelect })
    })

    return {
      success: true,
      message: `User ${status === 'ACTIVE' ? 'activated' : 'deactivated'}`,
      data: this.serializeAdminUser(user),
    }
  }
}
