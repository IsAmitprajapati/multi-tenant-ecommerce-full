import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { CustomerStatusDto, ListCustomersQueryDto, PageQueryDto, UpdateCustomerDto } from './dto/customers.dto.js';

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

/**
 * Platform admin › Customers — every shopper account on the marketplace.
 * Orders / lifetime value are 0 until checkout exists; the fields are already in the response.
 */
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly baseSelect = {
    id: true, fullName: true, email: true, phone: true, status: true, profileImage: true, createdAt: true,
    sessions: { select: { lastActiveAt: true }, orderBy: { lastActiveAt: 'desc' }, take: 1 },
    _count: { select: { cartItems: true, wishlistItems: true, productReviews: true, addresses: true, notifications: true, sessions: true } },
  } satisfies Prisma.UserSelect;

  private row(u: Prisma.UserGetPayload<{ select: CustomersService['baseSelect'] }>) {
    const { sessions, _count, ...rest } = u;
    return {
      ...rest,
      lastActiveAt: sessions[0]?.lastActiveAt ?? null,
      // Filled in once orders exist
      ordersCount: 0,
      lifetimeValue: 0,
      lastOrderAt: null as Date | null,
      counts: { cart: _count.cartItems, wishlist: _count.wishlistItems, reviews: _count.productReviews, addresses: _count.addresses, activity: _count.notifications, sessions: _count.sessions },
    };
  }

  async findAll(q: ListCustomersQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 10;

    const createdAt: Prisma.DateTimeFilter = {};
    if (q.from) createdAt.gte = new Date(`${q.from.slice(0, 10)}T00:00:00.000Z`);
    if (q.to) createdAt.lt = new Date(new Date(`${q.to.slice(0, 10)}T00:00:00.000Z`).getTime() + 86_400_000);

    const words = (q.search ?? '').split(/\s+/).filter(Boolean);
    const base: Prisma.UserWhereInput = {
      userType: 'CUSTOMER',
      ...(Object.keys(createdAt).length && { createdAt }),
      // Every word must match the name, email or phone
      ...(words.length && {
        AND: words.map((w) => ({
          OR: [
            { fullName: { contains: w, mode: 'insensitive' as const } },
            { email: { contains: w, mode: 'insensitive' as const } },
            { phone: { contains: w.replace(/^\+/, '') } },
          ],
        })),
      }),
    };
    const where: Prisma.UserWhereInput = { ...base, ...(q.status && { status: q.status }) };

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const [rows, total, byStatus, newThisMonth] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: this.baseSelect }),
      this.prisma.user.count({ where }),
      // Counts for the status chips (respecting search + dates, not the status itself)
      this.prisma.user.groupBy({ by: ['status'], where: base, _count: { _all: true } }),
      this.prisma.user.count({ where: { userType: 'CUSTOMER', createdAt: { gte: monthStart } } }),
    ]);

    const statusCounts = { ACTIVE: 0, INACTIVE: 0, SUSPENDED: 0 } as Record<string, number>;
    for (const s of byStatus) statusCounts[s.status] = s._count._all;

    return {
      data: rows.map((r) => this.row(r)),
      meta: {
        page, pageSize, total,
        statusCounts: { ALL: Object.values(statusCounts).reduce((a, b) => a + b, 0), ...statusCounts },
        newThisMonth,
      },
    };
  }

  async findOne(id: string) {
    const u = await this.prisma.user.findFirst({
      where: { id, userType: 'CUSTOMER' },
      select: {
        ...this.baseSelect,
        gender: true, dateOfBirth: true, updatedAt: true,
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }], select: { id: true, label: true, fullName: true, phone: true, line1: true, locality: true, landmark: true, city: true, state: true, pincode: true, isDefault: true } },
        productReviews: {
          orderBy: { createdAt: 'desc' }, take: 5,
          select: { id: true, rating: true, title: true, createdAt: true, product: { select: { title: true, slug: true, seller: { select: { name: true, slug: true } } } } },
        },
        cartItems: { where: { savedForLater: false }, select: { quantity: true } },
      },
    });
    if (!u) throw new NotFoundException('Customer not found');

    const activeSessions = await this.prisma.userSession.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } });
    const { addresses, productReviews, cartItems, gender, dateOfBirth, updatedAt, ...rest } = u;
    return {
      data: {
        ...this.row(rest),
        gender, dateOfBirth, updatedAt, activeSessions,
        cartUnits: cartItems.reduce((n, c) => n + c.quantity, 0),
        addresses,
        recentReviews: productReviews,
        orders: [] as unknown[],
      },
    };
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const existing = await this.prisma.user.findFirst({ where: { id, userType: 'CUSTOMER' }, select: { email: true, phone: true, fullName: true } });
    if (!existing) throw new NotFoundException('Customer not found');

    if (dto.email && dto.email !== existing.email) {
      const taken = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
      if (taken) throw new ConflictException('Another account already uses this email');
    }

    const data: Prisma.UserUpdateInput = {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone || null }),
    };
    await this.prisma.user.update({ where: { id }, data });

    const changed = [
      dto.fullName !== undefined && dto.fullName !== existing.fullName && 'name',
      dto.email !== undefined && dto.email !== existing.email && 'email',
      dto.phone !== undefined && (dto.phone || null) !== existing.phone && 'phone number',
    ].filter(Boolean) as string[];
    if (changed.length) {
      await this.notifications.notify(id, 'ACCOUNT', 'Your account details were updated', {
        body: `Our support team updated your ${changed.join(', ').replace(/, ([^,]*)$/, ' and $1')}. If you didn’t ask for this, contact support.`,
        link: '/account',
      });
    }
    return { message: changed.length ? 'Customer updated' : 'No changes', data: (await this.findOne(id)).data };
  }

  async changeStatus(id: string, dto: CustomerStatusDto) {
    const existing = await this.prisma.user.findFirst({ where: { id, userType: 'CUSTOMER' }, select: { id: true } });
    if (!existing) throw new NotFoundException('Customer not found');

    if (dto.action === 'DEACTIVATE') {
      // Signed out everywhere straight away; login and token refresh refuse non-ACTIVE accounts
      await this.prisma.$transaction([
        this.prisma.user.update({ where: { id }, data: { status: 'INACTIVE' } }),
        this.prisma.userSession.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      ]);
    } else {
      await this.prisma.user.update({ where: { id }, data: { status: 'ACTIVE' } });
    }
    return {
      message: dto.action === 'DEACTIVATE' ? 'Customer deactivated and signed out' : 'Customer reactivated',
      data: (await this.findOne(id)).data,
    };
  }

  // ───────────── History tabs (full customer details page) ─────────────

  private async assertCustomer(id: string) {
    const u = await this.prisma.user.findFirst({ where: { id, userType: 'CUSTOMER' }, select: { id: true } });
    if (!u) throw new NotFoundException('Customer not found');
  }

  private paging(q: PageQueryDto, fallback = 10) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? fallback;
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
  }

  private readonly productSelect = {
    id: true, title: true, slug: true, status: true, sellingPrice: true, compareAtPrice: true, inventoryQty: true,
    images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
    seller: { select: { name: true, slug: true, status: true } },
    _count: { select: { variants: true } },
  } satisfies Prisma.ProductSelect;

  private product(p: Prisma.ProductGetPayload<{ select: CustomersService['productSelect'] }>) {
    return {
      id: p.id, title: p.title, slug: p.slug, imageUrl: p.images[0]?.url ?? null,
      seller: { name: p.seller.name, slug: p.seller.slug },
      /** Shoppers can see / buy it */
      available: p.status === 'ACTIVE' && p.seller.status === 'ACTIVE',
      hasVariants: p._count.variants > 0,
    };
  }

  /** Cart lines (incl. "saved for later") priced from live data */
  async cart(id: string) {
    await this.assertCustomer(id);
    const items = await this.prisma.cartItem.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, quantity: true, savedForLater: true, createdAt: true, updatedAt: true,
        product: { select: this.productSelect },
        variant: { select: { id: true, name: true, price: true, compareAtPrice: true, inventoryQty: true } },
      },
    });
    const lines = items.map((i) => {
      const unitPrice = num(i.variant?.price ?? i.product.sellingPrice)!;
      const mrp = num(i.variant ? i.variant.compareAtPrice : i.product.compareAtPrice);
      const stock = i.variant ? i.variant.inventoryQty : i.product.inventoryQty;
      const product = this.product(i.product);
      return {
        id: i.id, quantity: i.quantity, savedForLater: i.savedForLater, addedAt: i.createdAt, updatedAt: i.updatedAt,
        product, variantName: i.variant?.name ?? null,
        unitPrice, mrp, stock, lineTotal: unitPrice * i.quantity,
        state: !product.available ? 'UNAVAILABLE' : stock <= 0 ? 'OUT_OF_STOCK' : 'OK',
      };
    });
    const inCart = lines.filter((l) => !l.savedForLater);
    const buyable = inCart.filter((l) => l.state === 'OK');
    return {
      data: {
        items: inCart,
        savedForLater: lines.filter((l) => l.savedForLater),
        summary: {
          lines: inCart.length,
          units: inCart.reduce((n, l) => n + l.quantity, 0),
          subtotal: buyable.reduce((n, l) => n + l.lineTotal, 0),
          savings: buyable.reduce((n, l) => n + (l.mrp && l.mrp > l.unitPrice ? (l.mrp - l.unitPrice) * l.quantity : 0), 0),
          sellers: new Set(inCart.map((l) => l.product.seller.slug)).size,
        },
      },
    };
  }

  async wishlist(id: string, q: PageQueryDto) {
    await this.assertCustomer(id);
    const { page, pageSize, skip, take } = this.paging(q, 12);
    const [rows, total] = await Promise.all([
      this.prisma.wishlistItem.findMany({
        where: { userId: id }, orderBy: { createdAt: 'desc' }, skip, take,
        select: { id: true, createdAt: true, product: { select: { ...this.productSelect, variants: { orderBy: { sortOrder: 'asc' }, select: { price: true, compareAtPrice: true, inventoryQty: true } } } } },
      }),
      this.prisma.wishlistItem.count({ where: { userId: id } }),
    ]);
    return {
      data: rows.map((w) => {
        const v = w.product.variants;
        const price = v.length ? Math.min(...v.map((x) => Number(x.price))) : num(w.product.sellingPrice)!;
        const cheapest = v.length ? v.reduce((a, b) => (Number(a.price) <= Number(b.price) ? a : b)) : null;
        const mrp = cheapest ? num(cheapest.compareAtPrice) : num(w.product.compareAtPrice);
        const stock = v.length ? v.reduce((n, x) => n + x.inventoryQty, 0) : w.product.inventoryQty;
        return { id: w.id, addedAt: w.createdAt, product: this.product(w.product), price, mrp, inStock: stock > 0 };
      }),
      meta: { page, pageSize, total },
    };
  }

  async reviews(id: string, q: PageQueryDto) {
    await this.assertCustomer(id);
    const { page, pageSize, skip, take } = this.paging(q);
    const [rows, total] = await Promise.all([
      this.prisma.productReview.findMany({
        where: { userId: id }, orderBy: { createdAt: 'desc' }, skip, take,
        select: { id: true, rating: true, title: true, body: true, status: true, createdAt: true, updatedAt: true, product: { select: this.productSelect } },
      }),
      this.prisma.productReview.count({ where: { userId: id } }),
    ]);
    return { data: rows.map((r) => ({ ...r, product: this.product(r.product) })), meta: { page, pageSize, total } };
  }

  /** Account timeline — everything we've told the customer (sign-up, profile / password changes, addresses …) */
  async activity(id: string, q: PageQueryDto) {
    await this.assertCustomer(id);
    const { page, pageSize, skip, take } = this.paging(q, 15);
    const [rows, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: id }, orderBy: { createdAt: 'desc' }, skip, take,
        select: { id: true, category: true, title: true, body: true, readAt: true, createdAt: true },
      }),
      this.prisma.notification.count({ where: { userId: id } }),
    ]);
    return { data: rows, meta: { page, pageSize, total } };
  }

  /** Sign-ins (devices) — newest first; refresh-token hashes are never returned */
  async sessions(id: string, q: PageQueryDto) {
    await this.assertCustomer(id);
    const { page, pageSize, skip, take } = this.paging(q);
    const [rows, total] = await Promise.all([
      this.prisma.userSession.findMany({
        where: { userId: id }, orderBy: { lastActiveAt: 'desc' }, skip, take,
        select: { id: true, device: true, os: true, browser: true, deviceLabel: true, ipAddress: true, createdAt: true, lastActiveAt: true, expiresAt: true, revokedAt: true },
      }),
      this.prisma.userSession.count({ where: { userId: id } }),
    ]);
    const now = Date.now();
    return {
      data: rows.map((s) => ({ ...s, state: s.revokedAt ? 'SIGNED_OUT' : s.expiresAt.getTime() < now ? 'EXPIRED' : 'ACTIVE' })),
      meta: { page, pageSize, total },
    };
  }

  /** Orders and payments arrive with checkout — the shape is fixed now so the admin UI is already wired */
  async orders(id: string, q: PageQueryDto) {
    await this.assertCustomer(id);
    const { page, pageSize } = this.paging(q);
    return { data: [] as unknown[], meta: { page, pageSize, total: 0 } };
  }

  async payments(id: string, q: PageQueryDto) {
    await this.assertCustomer(id);
    const { page, pageSize } = this.paging(q);
    return { data: [] as unknown[], meta: { page, pageSize, total: 0 } };
  }
}
