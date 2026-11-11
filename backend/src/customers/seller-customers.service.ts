import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { ListCustomersQueryDto, PageQueryDto } from './dto/customers.dto.js';

/**
 * Seller admin › Customers — READ-ONLY, and only shoppers who have ordered from this seller.
 * Sellers get ONLY: the customer's name, number of orders with them, total order value and those orders' details.
 * Never email/phone, carts, wishlists, saved addresses, reviews, devices or account activity — and nothing is editable.
 */
@Injectable()
export class SellerCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  private async sellerOf(actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: actorId }, select: { seller: { select: { id: true, status: true } } } });
    if (!user?.seller) throw new ForbiddenException('You are not part of a seller account');
    if (user.seller.status !== 'ACTIVE') throw new ForbiddenException('Your seller account is not active');
    return user.seller;
  }

  /**
   * Who counts as "this seller's customer": shoppers with at least one order containing this seller's items.
   * Orders don't exist yet, so this is always empty.
   * TODO(checkout): return { userId: { in: <customer ids from this seller's sub-orders> } } and fill the order stats below.
   */
  private buyersWhere(_sellerId: string): Prisma.UserWhereInput {
    return { id: { in: [] } };
  }

  async list(actorId: string, q: ListCustomersQueryDto) {
    const seller = await this.sellerOf(actorId);
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;
    const words = (q.search ?? '').split(/\s+/).filter(Boolean);
    const where: Prisma.UserWhereInput = {
      AND: [
        { userType: 'CUSTOMER' },
        this.buyersWhere(seller.id),
        // Name only — sellers can't look shoppers up by contact details
        ...words.map((w) => ({ fullName: { contains: w, mode: 'insensitive' as const } })),
      ],
    };
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
        select: { id: true, fullName: true },
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      // TODO(checkout): ordersCount / totalOrderValue from this seller's orders
      data: rows.map((r) => ({ ...r, ordersCount: 0, totalOrderValue: 0 })),
      meta: { page, pageSize, total },
    };
  }

  private async assertBuyer(actorId: string, customerId: string) {
    const seller = await this.sellerOf(actorId);
    const u = await this.prisma.user.findFirst({
      where: { AND: [{ id: customerId, userType: 'CUSTOMER' }, this.buyersWhere(seller.id)] },
      select: { id: true, fullName: true },
    });
    // Same answer whether the shopper doesn't exist or just never bought from this seller
    if (!u) throw new NotFoundException('Customer not found');
    return { seller, customer: u };
  }

  async findOne(actorId: string, customerId: string) {
    const { customer } = await this.assertBuyer(actorId, customerId);
    return { data: { ...customer, ordersCount: 0, totalOrderValue: 0 } };
  }

  /** Orders with THIS seller only */
  async orders(actorId: string, customerId: string, q: PageQueryDto) {
    await this.assertBuyer(actorId, customerId);
    return { data: [] as unknown[], meta: { page: q.page ?? 1, pageSize: q.pageSize ?? 10, total: 0 } };
  }
}
