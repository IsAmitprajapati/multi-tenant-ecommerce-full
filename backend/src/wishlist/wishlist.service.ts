import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { cardInclude, toCard, visibleProduct } from '../storefront/storefront.service.js';
import { MAX_WISHLIST } from './wishlist.dto.js';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) { }

  private assertCustomer(user: JwtAccessPayload) {
    if (user.userType !== 'CUSTOMER') throw new ForbiddenException('Only shopper accounts have a wishlist');
  }

  /** Product cards for ids, in the given order, skipping anything no longer for sale */
  async cards(ids: string[]) {
    const unique = [...new Set(ids)].slice(0, MAX_WISHLIST);
    if (!unique.length) return [];
    const rows = await this.prisma.product.findMany({ where: { ...visibleProduct, id: { in: unique } }, include: cardInclude });
    const byId = new Map(rows.map((r) => [r.id, toCard(r)]));
    return unique.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []));
  }

  async ids(userId: string) {
    const rows = await this.prisma.wishlistItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { productId: true } });
    return rows.map((r) => r.productId);
  }

  /** The signed-in shopper's wishlist, newest first */
  async list(user: JwtAccessPayload) {
    this.assertCustomer(user);
    const productIds = await this.ids(user.userId);
    return { productIds, items: await this.cards(productIds) };
  }

  async add(user: JwtAccessPayload, productId: string) {
    this.assertCustomer(user);
    const product = await this.prisma.product.findFirst({ where: { ...visibleProduct, id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('This product is no longer available');
    const exists = await this.prisma.wishlistItem.findUnique({ where: { userId_productId: { userId: user.userId, productId } }, select: { id: true } });
    if (!exists && (await this.prisma.wishlistItem.count({ where: { userId: user.userId } })) >= MAX_WISHLIST) {
      throw new BadRequestException(`Your wishlist can hold up to ${MAX_WISHLIST} items`);
    }
    if (!exists) await this.prisma.wishlistItem.create({ data: { userId: user.userId, productId } });
    return { productIds: await this.ids(user.userId) };
  }

  async remove(user: JwtAccessPayload, productId: string) {
    this.assertCustomer(user);
    await this.prisma.wishlistItem.deleteMany({ where: { userId: user.userId, productId } });
    return { productIds: await this.ids(user.userId) };
  }

  /** On login: fold the guest wishlist from the browser into the account */
  async merge(user: JwtAccessPayload, productIds: string[]) {
    this.assertCustomer(user);
    const live = await this.prisma.product.findMany({ where: { ...visibleProduct, id: { in: [...new Set(productIds)] } }, select: { id: true } });
    const room = MAX_WISHLIST - (await this.prisma.wishlistItem.count({ where: { userId: user.userId } }));
    if (room > 0 && live.length) {
      await this.prisma.wishlistItem.createMany({
        data: live.slice(0, room).map((p) => ({ userId: user.userId, productId: p.id })),
        skipDuplicates: true,
      });
    }
    return this.list(user);
  }
}
