import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { AddToCartDto, GuestCartLineDto, MAX_CART_LINES, MAX_LINE_QTY, UpdateCartItemDto } from './dto/cart.dto.js';

/** Platform delivery rule (as in the Cart design): free above ₹499, otherwise ₹40 per order */
export const FREE_DELIVERY_THRESHOLD = 499;
export const DELIVERY_FEE = 40;

interface Line {
  /** Cart item id (signed in) or "<productId>:<variantId>" (guest) */
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  savedForLater: boolean;
}

const lineKey = (productId: string, variantId?: string | null) => `${productId}:${variantId ?? ''}`;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) { }

  private assertCustomer(user: JwtAccessPayload) {
    if (user.userType !== 'CUSTOMER') throw new ForbiddenException('Only shopper accounts have a cart');
  }

  /** Product + option a shopper can buy right now, with its price and how many can be added */
  private async purchasable(productId: string, variantId?: string | null) {
    const p = await this.prisma.product.findFirst({
      where: { id: productId, status: 'ACTIVE', seller: { status: 'ACTIVE' }, category: { isActive: true } },
      select: { id: true, inventoryQty: true, variants: { select: { id: true, inventoryQty: true } } },
    });
    if (!p) throw new NotFoundException('This product is no longer available');
    if (p.variants.length) {
      const v = p.variants.find((x) => x.id === variantId);
      if (!v) throw new BadRequestException('Choose an option for this product');
      return { variantId: v.id, stock: v.inventoryQty };
    }
    if (variantId) throw new BadRequestException('This product has no options');
    return { variantId: null, stock: p.inventoryQty };
  }

  /**
   * Prices any list of lines from live data (signed-in and guest carts share this):
   * groups by store, flags unavailable/out-of-stock lines, caps quantities to stock, totals the bill.
   */
  async quote(lines: Line[]) {
    const ids = [...new Set(lines.map((l) => l.productId))];
    const products = ids.length ? await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true, slug: true, title: true, status: true, sellingPrice: true, compareAtPrice: true, inventoryQty: true,
        seller: { select: { name: true, slug: true, brandColor: true, status: true } },
        category: { select: { isActive: true, parent: { select: { isActive: true } } } },
        images: { select: { url: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        variants: { select: { id: true, name: true, price: true, compareAtPrice: true, inventoryQty: true } },
      },
    }) : [];
    const byId = new Map(products.map((p) => [p.id, p]));

    const priced = lines.map((l) => {
      const p = byId.get(l.productId);
      const variant = p?.variants.find((v) => v.id === l.variantId) ?? null;
      const live = !!p && p.status === 'ACTIVE' && p.seller.status === 'ACTIVE' && p.category.isActive && (p.category.parent?.isActive ?? true);
      const optionOk = !!p && (p.variants.length ? !!variant : !l.variantId);
      const stock = variant ? variant.inventoryQty : p?.inventoryQty ?? 0;
      const maxQty = Math.min(stock, MAX_LINE_QTY);
      const unitPrice = variant ? Number(variant.price) : Number(p?.sellingPrice ?? 0);
      const mrpRaw = variant ? variant.compareAtPrice : p?.compareAtPrice;
      const mrp = mrpRaw != null && Number(mrpRaw) > unitPrice ? Number(mrpRaw) : null;
      const status: 'OK' | 'UNAVAILABLE' | 'OUT_OF_STOCK' = !live || !optionOk ? 'UNAVAILABLE' : stock <= 0 ? 'OUT_OF_STOCK' : 'OK';
      const quantity = status === 'OK' ? Math.min(l.quantity, maxQty) : l.quantity;
      return {
        id: l.id,
        productId: l.productId,
        variantId: l.variantId,
        title: p?.title ?? 'Product no longer available',
        slug: p?.slug ?? null,
        variantName: variant?.name ?? null,
        imageUrl: p?.images[0]?.url ?? null,
        seller: p ? { name: p.seller.name, slug: p.seller.slug, brandColor: p.seller.brandColor } : null,
        unitPrice,
        mrp,
        quantity,
        /** Shopper asked for more than is in stock */
        quantityReduced: status === 'OK' && l.quantity > maxQty,
        maxQty,
        lineTotal: Math.round(unitPrice * quantity * 100) / 100,
        status,
        savedForLater: l.savedForLater,
      };
    });

    const inCart = priced.filter((l) => !l.savedForLater);
    const buyable = inCart.filter((l) => l.status === 'OK');
    const groups: { seller: NonNullable<(typeof priced)[number]['seller']>; items: typeof priced; subtotal: number }[] = [];
    for (const l of inCart) {
      if (!l.seller) continue;
      let g = groups.find((x) => x.seller.slug === l.seller!.slug);
      if (!g) { g = { seller: l.seller, items: [], subtotal: 0 }; groups.push(g); }
      g.items.push(l);
      if (l.status === 'OK') g.subtotal = Math.round((g.subtotal + l.lineTotal) * 100) / 100;
    }

    const subtotal = Math.round(buyable.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    const mrpTotal = Math.round(buyable.reduce((s, l) => s + (l.mrp ?? l.unitPrice) * l.quantity, 0) * 100) / 100;
    const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
    return {
      groups,
      // Lines whose product was removed entirely (no seller to group under)
      unavailable: inCart.filter((l) => !l.seller),
      saved: priced.filter((l) => l.savedForLater),
      summary: {
        itemCount: buyable.reduce((n, l) => n + l.quantity, 0),
        subtotal,
        savings: Math.round((mrpTotal - subtotal) * 100) / 100,
        deliveryFee,
        freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
        amountToFreeDelivery: subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : Math.round((FREE_DELIVERY_THRESHOLD - subtotal) * 100) / 100,
        /** Prices include GST */
        taxesIncluded: true,
        total: Math.round((subtotal + deliveryFee) * 100) / 100,
        hasProblems: inCart.some((l) => l.status !== 'OK' || l.quantityReduced),
      },
    };
  }

  // ───────────── Signed-in cart ─────────────

  private async linesFor(userId: string): Promise<Line[]> {
    const rows = await this.prisma.cartItem.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({ id: r.id, productId: r.productId, variantId: r.variantId, quantity: r.quantity, savedForLater: r.savedForLater }));
  }

  async get(user: JwtAccessPayload) {
    this.assertCustomer(user);
    return this.quote(await this.linesFor(user.userId));
  }

  async add(user: JwtAccessPayload, dto: AddToCartDto) {
    this.assertCustomer(user);
    const { variantId, stock } = await this.purchasable(dto.productId, dto.variantId);
    if (stock <= 0) throw new BadRequestException('This item is out of stock');
    const max = Math.min(stock, MAX_LINE_QTY);
    const key = { userId_productId_variantKey: { userId: user.userId, productId: dto.productId, variantKey: variantId ?? '' } };
    const existing = await this.prisma.cartItem.findUnique({ where: key });
    if (!existing && (await this.prisma.cartItem.count({ where: { userId: user.userId } })) >= MAX_CART_LINES) {
      throw new BadRequestException(`Your cart can hold up to ${MAX_CART_LINES} different items`);
    }
    const quantity = Math.min((existing && !existing.savedForLater ? existing.quantity : 0) + dto.quantity, max);
    await this.prisma.cartItem.upsert({
      where: key,
      create: { userId: user.userId, productId: dto.productId, variantId, variantKey: variantId ?? '', quantity },
      update: { quantity, savedForLater: false },
    });
    const capped = quantity < (existing && !existing.savedForLater ? existing.quantity : 0) + dto.quantity;
    const message = !capped ? 'Added to cart'
      : stock < MAX_LINE_QTY ? `Only ${stock} in stock — your cart has all of them`
        : `You can buy up to ${MAX_LINE_QTY} of this item — your cart has the maximum`;
    return { message, cart: await this.get(user) };
  }

  private async own(user: JwtAccessPayload, id: string) {
    this.assertCustomer(user);
    const item = await this.prisma.cartItem.findUnique({ where: { id } });
    if (!item || item.userId !== user.userId) throw new NotFoundException('Item not in your cart');
    return item;
  }

  async update(user: JwtAccessPayload, id: string, dto: UpdateCartItemDto) {
    const item = await this.own(user, id);
    let quantity = dto.quantity ?? item.quantity;
    if (dto.quantity != null || dto.savedForLater === false) {
      // Never above what's in stock
      const { stock } = await this.purchasable(item.productId, item.variantId).catch(() => ({ stock: quantity }));
      if (stock > 0) quantity = Math.min(quantity, stock, MAX_LINE_QTY);
    }
    await this.prisma.cartItem.update({ where: { id }, data: { quantity, ...(dto.savedForLater !== undefined && { savedForLater: dto.savedForLater }) } });
    return this.get(user);
  }

  async remove(user: JwtAccessPayload, id: string) {
    await this.own(user, id);
    await this.prisma.cartItem.delete({ where: { id } });
    return this.get(user);
  }

  /** On login: fold the guest cart from the browser into the account (quantities add up, capped to stock) */
  async merge(user: JwtAccessPayload, items: GuestCartLineDto[]) {
    this.assertCustomer(user);
    for (const it of items) {
      try {
        const { variantId, stock } = await this.purchasable(it.productId, it.variantId);
        const key = { userId_productId_variantKey: { userId: user.userId, productId: it.productId, variantKey: variantId ?? '' } };
        const existing = await this.prisma.cartItem.findUnique({ where: key });
        const quantity = Math.max(1, Math.min((existing?.quantity ?? 0) + it.quantity, Math.max(stock, 1), MAX_LINE_QTY));
        if (!existing && (await this.prisma.cartItem.count({ where: { userId: user.userId } })) >= MAX_CART_LINES) break;
        await this.prisma.cartItem.upsert({
          where: key,
          create: { userId: user.userId, productId: it.productId, variantId, variantKey: variantId ?? '', quantity, savedForLater: it.savedForLater ?? false },
          update: { quantity, ...(it.savedForLater === false && { savedForLater: false }) },
        });
      } catch { /* skip items that are no longer sold */ }
    }
    return this.get(user);
  }

  // ───────────── Guest cart ─────────────

  /** Prices a guest cart sent from the browser (nothing is stored) */
  quoteGuest(items: GuestCartLineDto[]) {
    const merged = new Map<string, Line>();
    for (const it of items) {
      const id = lineKey(it.productId, it.variantId);
      const prev = merged.get(id);
      merged.set(id, { id, productId: it.productId, variantId: it.variantId ?? null, quantity: Math.min((prev?.quantity ?? 0) + it.quantity, MAX_LINE_QTY), savedForLater: it.savedForLater ?? false });
    }
    return this.quote([...merged.values()]);
  }
}
