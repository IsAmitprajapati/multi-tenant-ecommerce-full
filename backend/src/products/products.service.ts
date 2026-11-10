import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { ProductStatus } from '../generated/prisma/enums.js';
import { ImageKitStorageService } from '../sellers/imagekit-storage.service.js';
import {
  CreateProductDto, ListProductsQueryDto, ProductVariantDto, StockAdjustmentDto, UpdateProductDto,
} from './dto/product.dto.js';

const PACKAGE_TYPES = [
  { value: 'STANDARD_BAG', label: 'Standard bag' },
  { value: 'BOX', label: 'Box' },
  { value: 'ENVELOPE', label: 'Envelope' },
  { value: 'FRAGILE', label: 'Fragile (extra care)' },
  { value: 'CUSTOM', label: 'Custom packaging' },
];
const DELIVERY_SCOPES = [
  { value: 'SELLER_PINCODE_ONLY', label: 'Seller pincode only', description: 'Delivered only where you already deliver.' },
  { value: 'SPECIFIC_PINCODES', label: 'Specific pincodes', description: 'Choose additional pincodes this product can reach.' },
  { value: 'PAN_INDIA', label: 'Pan India', description: 'Ships anywhere in India via courier.' },
];
const ADJUSTMENT_REASONS = [
  { value: 'INITIAL_STOCK', label: 'Initial stock', manual: false },
  { value: 'RESTOCK', label: 'Restock delivery', manual: true },
  { value: 'RETURNED', label: 'Customer return', manual: true },
  { value: 'DAMAGED', label: 'Damaged, written off', manual: true },
  { value: 'MANUAL_ADJUSTMENT', label: 'Stock count correction', manual: true },
  { value: 'SOLD_VIA_ORDER', label: 'Sold via orders', manual: false },
  { value: 'OTHER', label: 'Other', manual: true },
];

const listInclude = {
  category: { select: { id: true, name: true, parent: { select: { name: true } } } },
  images: { select: { url: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
  variants: { select: { price: true, compareAtPrice: true, inventoryQty: true, sku: true } },
} satisfies Prisma.ProductInclude;

const detailInclude = {
  category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
  brand: { select: { id: true, name: true } },
  taxClass: { select: { id: true, hsnCode: true, description: true, gstRatePercent: true } },
  variants: { orderBy: { sortOrder: 'asc' } },
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
  adjustments: {
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true, changeQty: true, resultingQty: true, reason: true, note: true, createdAt: true,
      variant: { select: { id: true, name: true } },
      adjustedBy: { select: { id: true, fullName: true } },
    },
  },
} satisfies Prisma.ProductInclude;

type ListRow = Prisma.ProductGetPayload<{ include: typeof listInclude }>;
type DetailRow = Prisma.ProductGetPayload<{ include: typeof detailInclude }>;

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));

const slugify = (v: string) =>
  v.toLowerCase().normalize('NFKD').replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 110) || 'product';

/**
 * Delete rule: a product can be deleted only if it has never been ordered.
 * Once any order (completed or in progress) includes it, it can only be deactivated.
 */
function deleteRule(p: { firstOrderedAt: Date | null }) {
  return p.firstOrderedAt
    ? { canDelete: false, deleteBlockedReason: 'This product has orders, so it can’t be deleted — deactivate it to hide it from customers.' }
    : { canDelete: true, deleteBlockedReason: null };
}

/** Total stock + status: OUT (0), LOW (≤ threshold), IN */
function stockOf(p: { inventoryQty: number; lowStockThreshold: number; variants: { inventoryQty: number }[] }) {
  const total = p.variants.length ? p.variants.reduce((sum, v) => sum + v.inventoryQty, 0) : p.inventoryQty;
  const status = total <= 0 ? 'OUT' : total <= p.lowStockThreshold ? 'LOW' : 'IN';
  return { total, status: status as 'IN' | 'LOW' | 'OUT' };
}

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageKitStorageService,
  ) { }

  /** The actor's seller — must be approved */
  private async sellerOf(actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { seller: { select: { id: true, name: true, status: true, category: true } } },
    });
    if (!user?.seller) throw new ForbiddenException('You are not part of a seller account');
    if (user.seller.status !== 'ACTIVE') throw new ForbiddenException('Your seller account is not active');
    return user.seller;
  }

  private async findOwned(sellerId: string, id: string) {
    const product = await this.prisma.product.findFirst({ where: { id, sellerId }, include: detailInclude });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  private serializeListItem(p: ListRow) {
    const prices = p.variants.length ? p.variants.map((v) => Number(v.price)) : [Number(p.sellingPrice)];
    const stock = stockOf(p);
    return {
      id: p.id,
      title: p.title,
      slug: p.slug,
      sku: p.sku,
      status: p.status,
      imageUrl: p.images[0]?.url ?? null,
      category: { id: p.category.id, name: p.category.name, parentName: p.category.parent?.name ?? null },
      price: Math.min(...prices),
      priceMax: Math.max(...prices),
      compareAtPrice: p.variants.length ? null : num(p.compareAtPrice),
      variantCount: p.variants.length,
      stock: stock.total,
      stockStatus: stock.status,
      lowStockThreshold: p.lowStockThreshold,
      updatedAt: p.updatedAt,
      ...deleteRule(p),
    };
  }

  private serializeDetail(p: DetailRow) {
    const stock = stockOf(p);
    const selling = Number(p.sellingPrice);
    const cost = num(p.costPerItem);
    return {
      ...p,
      sellingPrice: selling,
      compareAtPrice: num(p.compareAtPrice),
      costPerItem: cost,
      weightKg: num(p.weightKg),
      taxClass: { ...p.taxClass, gstRatePercent: Number(p.taxClass.gstRatePercent) },
      variants: p.variants.map((v) => ({ ...v, price: Number(v.price), compareAtPrice: num(v.compareAtPrice) })),
      stock: stock.total,
      stockStatus: stock.status,
      ...deleteRule(p),
      margin: cost != null ? { perUnit: +(selling - cost).toFixed(2), percent: selling ? Math.round(((selling - cost) / selling) * 100) : 0 } : null,
    };
  }

  /* ------------------------------- Meta ------------------------------- */

  async meta(actorId: string) {
    const seller = await this.sellerOf(actorId);
    const [tops, taxClasses, brands] = await Promise.all([
      this.prisma.productCategory.findMany({
        where: { parentId: null, isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true, name: true, sellerCategory: true, requiresFssai: true,
          children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } },
        },
      }),
      this.prisma.taxClass.findMany({ where: { isActive: true }, orderBy: [{ gstRatePercent: 'asc' }, { hsnCode: 'asc' }] }),
      this.prisma.brand.findMany({ where: { sellerId: seller.id }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    ]);
    // The seller's own category first
    const categories = [...tops].sort((a, b) => Number(b.sellerCategory === seller.category) - Number(a.sellerCategory === seller.category));
    return {
      data: {
        categories,
        taxClasses: taxClasses.map((t) => ({ id: t.id, hsnCode: t.hsnCode, description: t.description, gstRatePercent: Number(t.gstRatePercent) })),
        brands,
        packageTypes: PACKAGE_TYPES,
        deliveryScopes: DELIVERY_SCOPES,
        adjustmentReasons: ADJUSTMENT_REASONS,
      },
    };
  }

  /* ------------------------------- Read ------------------------------- */

  async list(actorId: string, query: ListProductsQueryDto) {
    const seller = await this.sellerOf(actorId);
    const q = query.search?.trim();
    const rows = await this.prisma.product.findMany({
      where: {
        sellerId: seller.id,
        ...(query.status && { status: query.status }),
        ...(query.categoryId && { OR: [{ categoryId: query.categoryId }, { category: { parentId: query.categoryId } }] }),
        ...(q && {
          AND: [{
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
            ],
          }],
        }),
      },
      orderBy: { updatedAt: 'desc' },
      include: listInclude,
    });
    const items = rows.map((r) => this.serializeListItem(r)).filter((p) => !query.stock || p.stockStatus === query.stock);
    return { data: items };
  }

  async get(actorId: string, id: string) {
    const seller = await this.sellerOf(actorId);
    return { data: this.serializeDetail(await this.findOwned(seller.id, id)) };
  }

  async slugAvailability(actorId: string, slug: string, excludeId?: string) {
    const seller = await this.sellerOf(actorId);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 2) {
      return { data: { slug, available: false, reason: 'Use lowercase letters, numbers and hyphens' } };
    }
    const taken = await this.prisma.product.findFirst({
      where: { sellerId: seller.id, slug, ...(excludeId && { NOT: { id: excludeId } }) },
      select: { id: true },
    });
    return { data: { slug, available: !taken, reason: taken ? 'Another of your products already uses this URL' : null } };
  }

  /* ----------------------------- Validation ----------------------------- */

  private async checkRefs(sellerId: string, dto: UpdateProductDto, productId?: string) {
    if (dto.categoryId) {
      const cat = await this.prisma.productCategory.findUnique({ where: { id: dto.categoryId }, select: { isActive: true, parentId: true } });
      if (!cat || !cat.isActive) throw new BadRequestException('Choose a valid category');
      if (!cat.parentId) throw new BadRequestException('Choose a sub-category (e.g. Fruits under Grocery & food)');
    }
    if (dto.taxClassId) {
      const tax = await this.prisma.taxClass.findUnique({ where: { id: dto.taxClassId }, select: { isActive: true } });
      if (!tax?.isActive) throw new BadRequestException('Choose a valid tax class');
    }
    if (dto.slug) {
      const taken = await this.prisma.product.findFirst({
        where: { sellerId, slug: dto.slug, ...(productId && { NOT: { id: productId } }) }, select: { id: true },
      });
      if (taken) throw new ConflictException({ statusCode: 409, field: 'slug', message: 'Another of your products already uses this URL handle' });
    }

    // SKUs must be unique across the seller's catalog
    const skus = [dto.sku, ...(dto.variants ?? []).map((v) => v.sku)].filter((s): s is string => Boolean(s)).map((s) => s.toLowerCase());
    const dupInForm = skus.find((s, i) => skus.indexOf(s) !== i);
    if (dupInForm) throw new BadRequestException(`SKU "${dupInForm}" is used more than once`);
    if (skus.length) {
      const clash = await this.prisma.product.findFirst({
        where: {
          sellerId,
          ...(productId && { NOT: { id: productId } }),
          OR: [
            { sku: { in: skus, mode: 'insensitive' } },
            { variants: { some: { sku: { in: skus, mode: 'insensitive' } } } },
          ],
        },
        select: { title: true },
      });
      if (clash) throw new ConflictException({ statusCode: 409, field: 'sku', message: `One of these SKUs is already used by "${clash.title}"` });
    }

    const priceErr = (price?: number, compareAt?: number) => compareAt != null && price != null && compareAt > 0 && compareAt <= price;
    if (priceErr(dto.sellingPrice, dto.compareAtPrice)) throw new BadRequestException('Compare-at price must be higher than the selling price');
    for (const v of dto.variants ?? []) {
      if (priceErr(v.price, v.compareAtPrice)) throw new BadRequestException(`Variant "${v.name}": compare-at price must be higher than its price`);
    }
    if (dto.deliveryScope === 'SPECIFIC_PINCODES' && dto.deliveryPincodes && dto.deliveryPincodes.length === 0) {
      throw new BadRequestException('Add at least one pincode for specific-pincode delivery');
    }
  }

  private async uniqueSlug(sellerId: string, base: string) {
    let slug = base;
    for (let i = 2; await this.prisma.product.findFirst({ where: { sellerId, slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
    return slug;
  }

  private async brandId(sellerId: string, name?: string) {
    if (name === undefined) return undefined;
    if (!name) return null;
    const brand = await this.prisma.brand.upsert({
      where: { sellerId_name: { sellerId, name } },
      update: {},
      create: { sellerId, name },
      select: { id: true },
    });
    return brand.id;
  }

  /** Verify uploaded images with ImageKit; existing ones are kept as-is */
  private async resolveImages(fileIds: string[], existing: { fileId: string; url: string }[] = []) {
    const known = new Map(existing.map((i) => [i.fileId, i.url]));
    return Promise.all(fileIds.map(async (fileId, i) => {
      const url = known.get(fileId) ?? (await this.storage.verify(fileId, 'product')).url!;
      return { fileId, url, sortOrder: i, isPrimary: i === 0 };
    }));
  }

  /* ------------------------------- Write ------------------------------- */

  async create(actorId: string, dto: CreateProductDto) {
    const seller = await this.sellerOf(actorId);
    await this.checkRefs(seller.id, dto);
    const slug = dto.slug ?? (await this.uniqueSlug(seller.id, slugify(dto.title)));
    const images = await this.resolveImages((dto.images ?? []).map((i) => i.fileId));
    const brandId = await this.brandId(seller.id, dto.brandName);
    const variants = dto.variants ?? [];

    const id = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          sellerId: seller.id,
          categoryId: dto.categoryId,
          brandId: brandId ?? null,
          title: dto.title,
          description: dto.description || null,
          slug,
          seoTitle: dto.seoTitle || null,
          seoDescription: dto.seoDescription || null,
          status: dto.status ?? 'ACTIVE',
          sellingPrice: dto.sellingPrice,
          compareAtPrice: dto.compareAtPrice ?? null,
          costPerItem: dto.costPerItem ?? null,
          taxClassId: dto.taxClassId,
          sku: variants.length ? null : (dto.sku ?? null),
          inventoryQty: variants.length ? 0 : (dto.inventoryQty ?? 0),
          lowStockThreshold: dto.lowStockThreshold ?? 5,
          weightKg: dto.weightKg ?? null,
          packageType: dto.packageType ?? 'STANDARD_BAG',
          requiresColdChain: dto.requiresColdChain ?? false,
          deliveryScope: dto.deliveryScope ?? 'SELLER_PINCODE_ONLY',
          deliveryPincodes: dto.deliveryScope === 'SPECIFIC_PINCODES' ? (dto.deliveryPincodes ?? []) : [],
          images: { create: images },
        },
        select: { id: true, inventoryQty: true },
      });

      // Opening stock is logged like any other stock change
      if (!variants.length && product.inventoryQty > 0) {
        await tx.inventoryAdjustment.create({
          data: { productId: product.id, changeQty: product.inventoryQty, resultingQty: product.inventoryQty, reason: 'INITIAL_STOCK', adjustedById: actorId },
        });
      }
      for (const [i, v] of variants.entries()) await this.createVariant(tx, product.id, v, i, actorId);
      return product.id;
    }).catch((e: unknown) => this.rethrowUnique(e));

    return { success: true, message: 'Product created', data: this.serializeDetail(await this.findOwned(seller.id, id)) };
  }

  private async createVariant(tx: Prisma.TransactionClient, productId: string, v: ProductVariantDto, sortOrder: number, actorId: string) {
    const qty = v.inventoryQty ?? 0;
    const variant = await tx.productVariant.create({
      data: { productId, name: v.name, price: v.price, compareAtPrice: v.compareAtPrice ?? null, sku: v.sku ?? null, inventoryQty: qty, sortOrder },
      select: { id: true },
    });
    if (qty > 0) {
      await tx.inventoryAdjustment.create({
        data: { productId, variantId: variant.id, changeQty: qty, resultingQty: qty, reason: 'INITIAL_STOCK', adjustedById: actorId },
      });
    }
  }

  async update(actorId: string, id: string, dto: UpdateProductDto) {
    const seller = await this.sellerOf(actorId);
    const existing = await this.findOwned(seller.id, id);
    await this.checkRefs(seller.id, dto, id);

    for (const v of dto.variants ?? []) {
      if (v.id && !existing.variants.some((ev) => ev.id === v.id)) throw new BadRequestException('Unknown variant');
    }
    const images = dto.images ? await this.resolveImages(dto.images.map((i) => i.fileId), existing.images) : null;
    const brandId = await this.brandId(seller.id, dto.brandName);
    const willHaveVariants = dto.variants ? dto.variants.length > 0 : existing.variants.length > 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.title !== undefined && { title: dto.title }),
          ...(dto.description !== undefined && { description: dto.description || null }),
          ...(dto.categoryId && { categoryId: dto.categoryId }),
          ...(brandId !== undefined && { brandId }),
          ...(dto.slug && { slug: dto.slug }),
          ...(dto.seoTitle !== undefined && { seoTitle: dto.seoTitle || null }),
          ...(dto.seoDescription !== undefined && { seoDescription: dto.seoDescription || null }),
          ...(dto.status && { status: dto.status }),
          ...(dto.sellingPrice !== undefined && { sellingPrice: dto.sellingPrice }),
          ...('compareAtPrice' in dto && { compareAtPrice: dto.compareAtPrice ?? null }),
          ...('costPerItem' in dto && { costPerItem: dto.costPerItem ?? null }),
          ...(dto.taxClassId && { taxClassId: dto.taxClassId }),
          ...('sku' in dto && { sku: willHaveVariants ? null : (dto.sku ?? null) }),
          ...(dto.lowStockThreshold !== undefined && { lowStockThreshold: dto.lowStockThreshold }),
          ...('weightKg' in dto && { weightKg: dto.weightKg ?? null }),
          ...(dto.packageType && { packageType: dto.packageType }),
          ...(dto.requiresColdChain !== undefined && { requiresColdChain: dto.requiresColdChain }),
          ...(dto.deliveryScope && { deliveryScope: dto.deliveryScope }),
          ...((dto.deliveryScope || dto.deliveryPincodes) && {
            deliveryPincodes: (dto.deliveryScope ?? existing.deliveryScope) === 'SPECIFIC_PINCODES' ? (dto.deliveryPincodes ?? existing.deliveryPincodes) : [],
          }),
        },
      });

      // Variants: update kept ones (stock changes go through adjustments), add new, remove missing
      if (dto.variants) {
        const keep = new Set(dto.variants.filter((v) => v.id).map((v) => v.id!));
        await tx.productVariant.deleteMany({ where: { productId: id, id: { notIn: [...keep] } } });
        for (const [i, v] of dto.variants.entries()) {
          if (v.id) {
            await tx.productVariant.update({
              where: { id: v.id },
              data: { name: v.name, price: v.price, compareAtPrice: v.compareAtPrice ?? null, sku: v.sku ?? null, sortOrder: i },
            });
          } else {
            await this.createVariant(tx, id, v, i, actorId);
          }
        }
      }

      if (images) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length) await tx.productImage.createMany({ data: images.map((img) => ({ ...img, productId: id })) });
      }
    }).catch((e: unknown) => this.rethrowUnique(e));

    return { success: true, message: 'Product saved', data: this.serializeDetail(await this.findOwned(seller.id, id)) };
  }

  async setStatus(actorId: string, id: string, status: ProductStatus) {
    const seller = await this.sellerOf(actorId);
    await this.findOwned(seller.id, id);
    await this.prisma.product.update({ where: { id }, data: { status } });
    return {
      success: true,
      message: status === 'ACTIVE' ? 'Product is now visible on your page' : 'Product hidden from customers',
      data: this.serializeDetail(await this.findOwned(seller.id, id)),
    };
  }

  async remove(actorId: string, id: string) {
    const seller = await this.sellerOf(actorId);
    const product = await this.findOwned(seller.id, id);
    const rule = deleteRule(product);
    if (!rule.canDelete) throw new ConflictException(rule.deleteBlockedReason);

    // Guard against an order being placed at the same moment: only delete if still never ordered
    const res = await this.prisma.product.deleteMany({ where: { id, sellerId: seller.id, firstOrderedAt: null } });
    if (res.count === 0) throw new ConflictException(deleteRule({ firstOrderedAt: new Date() }).deleteBlockedReason);
    return { success: true, message: 'Product deleted' };
  }

  /**
   * Called by checkout (inside its transaction) when an order is placed.
   * After this the products can only be deactivated, never deleted.
   */
  async markOrdered(tx: Prisma.TransactionClient, productIds: string[]) {
    if (!productIds.length) return;
    await tx.product.updateMany({ where: { id: { in: productIds }, firstOrderedAt: null }, data: { firstOrderedAt: new Date() } });
  }

  /** Every stock change is logged (restock, damaged, returns, corrections) */
  async adjustStock(actorId: string, id: string, dto: StockAdjustmentDto) {
    const seller = await this.sellerOf(actorId);
    const product = await this.findOwned(seller.id, id);
    const hasVariants = product.variants.length > 0;
    if (hasVariants && !dto.variantId) throw new BadRequestException('Choose which variant to adjust');
    if (!hasVariants && dto.variantId) throw new BadRequestException('This product has no variants');
    const variant = dto.variantId ? product.variants.find((v) => v.id === dto.variantId) : null;
    if (dto.variantId && !variant) throw new BadRequestException('Unknown variant');

    const resulting = await this.prisma.$transaction(async (tx) => {
      // Atomic change that refuses to go below zero
      const updated = variant
        ? await tx.productVariant.updateMany({
          where: { id: variant.id, inventoryQty: { gte: -dto.change } },
          data: { inventoryQty: { increment: dto.change } },
        })
        : await tx.product.updateMany({
          where: { id, inventoryQty: { gte: -dto.change } },
          data: { inventoryQty: { increment: dto.change } },
        });
      if (updated.count === 0) throw new BadRequestException('Stock can’t go below zero');

      const now = variant
        ? (await tx.productVariant.findUniqueOrThrow({ where: { id: variant.id }, select: { inventoryQty: true } })).inventoryQty
        : (await tx.product.findUniqueOrThrow({ where: { id }, select: { inventoryQty: true } })).inventoryQty;
      await tx.inventoryAdjustment.create({
        data: { productId: id, variantId: variant?.id ?? null, changeQty: dto.change, resultingQty: now, reason: dto.reason, note: dto.note || null, adjustedById: actorId },
      });
      return now;
    });

    return {
      success: true,
      message: `Stock ${dto.change > 0 ? 'increased' : 'reduced'} — now ${resulting}${variant ? ` for ${variant.name}` : ''}`,
      data: this.serializeDetail(await this.findOwned(seller.id, id)),
    };
  }

  private rethrowUnique(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002' && JSON.stringify(e.meta ?? {}).includes('slug')) {
      throw new ConflictException({ statusCode: 409, field: 'slug', message: 'Another of your products already uses this URL handle' });
    }
    throw e;
  }
}
