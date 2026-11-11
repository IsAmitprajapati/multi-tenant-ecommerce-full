import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { AddressDto, NotificationPrefsDto } from './dto/account.dto.js';

const MAX_ADDRESSES = 20;

/** Defaults: everything on except SMS (as in the Notification settings design) */
export const DEFAULT_NOTIFICATION_PREFS = {
  topics: { orderUpdates: true, promotions: true, priceDrops: false, newArrivals: true },
  channels: { push: true, email: true, sms: false },
};

/** Shopper's own account data (storefront My account) */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) { }

  private assertCustomer(user: JwtAccessPayload) {
    if (user.userType !== 'CUSTOMER') throw new ForbiddenException('This is only for shopper accounts');
  }

  // ───────────── Addresses ─────────────

  async addresses(user: JwtAccessPayload) {
    this.assertCustomer(user);
    return this.prisma.address.findMany({ where: { userId: user.userId }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }] });
  }

  private normalisePhone = (p: string) => (p.startsWith('+91') ? p : `+91${p}`);

  async addAddress(user: JwtAccessPayload, dto: AddressDto) {
    this.assertCustomer(user);
    const count = await this.prisma.address.count({ where: { userId: user.userId } });
    if (count >= MAX_ADDRESSES) throw new BadRequestException(`You can save up to ${MAX_ADDRESSES} addresses`);
    // The first address is always the default
    const makeDefault = count === 0 || !!dto.isDefault;
    const address = await this.prisma.$transaction(async (tx) => {
      if (makeDefault) await tx.address.updateMany({ where: { userId: user.userId }, data: { isDefault: false } });
      return tx.address.create({ data: { ...dto, phone: this.normalisePhone(dto.phone), landmark: dto.landmark ?? null, isDefault: makeDefault, userId: user.userId } });
    });
    await this.notifications.notify(user.userId, 'ACCOUNT', `New address saved: ${address.label}`, { link: '/account/addresses' });
    return { message: 'Address saved', data: address, addresses: await this.addresses(user) };
  }

  private async own(user: JwtAccessPayload, id: string) {
    this.assertCustomer(user);
    const a = await this.prisma.address.findUnique({ where: { id } });
    if (!a || a.userId !== user.userId) throw new NotFoundException('Address not found');
    return a;
  }

  async updateAddress(user: JwtAccessPayload, id: string, dto: AddressDto) {
    const existing = await this.own(user, id);
    await this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) await tx.address.updateMany({ where: { userId: user.userId }, data: { isDefault: false } });
      await tx.address.update({
        where: { id },
        // Unticking "default" on the default address is ignored — another must be chosen instead
        data: { ...dto, phone: this.normalisePhone(dto.phone), landmark: dto.landmark ?? null, isDefault: dto.isDefault || existing.isDefault },
      });
    });
    return { message: 'Address updated', addresses: await this.addresses(user) };
  }

  async setDefault(user: JwtAccessPayload, id: string) {
    await this.own(user, id);
    await this.prisma.$transaction([
      this.prisma.address.updateMany({ where: { userId: user.userId }, data: { isDefault: false } }),
      this.prisma.address.update({ where: { id }, data: { isDefault: true } }),
    ]);
    return { message: 'Default address updated', addresses: await this.addresses(user) };
  }

  async removeAddress(user: JwtAccessPayload, id: string) {
    const existing = await this.own(user, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({ where: { id } });
      // Keep one default: promote the oldest remaining address
      if (existing.isDefault) {
        const next = await tx.address.findFirst({ where: { userId: user.userId }, orderBy: { createdAt: 'asc' }, select: { id: true } });
        if (next) await tx.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return { message: 'Address removed', addresses: await this.addresses(user) };
  }

  // ───────────── Notifications ─────────────

  async notificationsList(user: JwtAccessPayload, category?: string) {
    this.assertCustomer(user);
    const where: Prisma.NotificationWhereInput = { userId: user.userId, ...(category && category !== 'all' && { category: category.toUpperCase() as 'ORDERS' | 'OFFERS' | 'ACCOUNT' }) };
    const [items, unread] = await Promise.all([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 100 }),
      this.prisma.notification.count({ where: { userId: user.userId, readAt: null } }),
    ]);
    return { items, unread };
  }

  async markRead(user: JwtAccessPayload, id: string) {
    this.assertCustomer(user);
    await this.prisma.notification.updateMany({ where: { id, userId: user.userId, readAt: null }, data: { readAt: new Date() } });
    return { unread: await this.prisma.notification.count({ where: { userId: user.userId, readAt: null } }) };
  }

  async markAllRead(user: JwtAccessPayload) {
    this.assertCustomer(user);
    await this.prisma.notification.updateMany({ where: { userId: user.userId, readAt: null }, data: { readAt: new Date() } });
    return { unread: 0 };
  }

  // ───────────── Notification settings ─────────────

  async notificationPrefs(user: JwtAccessPayload) {
    this.assertCustomer(user);
    const u = await this.prisma.user.findUnique({ where: { id: user.userId }, select: { notificationPrefs: true } });
    const saved = (u?.notificationPrefs ?? {}) as Partial<typeof DEFAULT_NOTIFICATION_PREFS>;
    return {
      topics: { ...DEFAULT_NOTIFICATION_PREFS.topics, ...(saved.topics ?? {}) },
      channels: { ...DEFAULT_NOTIFICATION_PREFS.channels, ...(saved.channels ?? {}) },
    };
  }

  async saveNotificationPrefs(user: JwtAccessPayload, dto: NotificationPrefsDto) {
    this.assertCustomer(user);
    const prefs = { topics: { ...dto.topics }, channels: { ...dto.channels } };
    await this.prisma.user.update({ where: { id: user.userId }, data: { notificationPrefs: prefs } });
    return { message: 'Notification settings saved', data: prefs };
  }
}
