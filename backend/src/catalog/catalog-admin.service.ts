import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import {
  ActiveDto, AttributeDto, BlockProductDto, FlagProductDto, ListBrandsQueryDto, ListPlatformProductsQueryDto,
  TaxClassDto, UpdateAttributeDto, UpdateTaxClassDto,
} from './dto/catalog-admin.dto.js';

const num = (d: Prisma.Decimal | null | undefined) => (d == null ? null : Number(d));
const words = (q?: string) => (q ?? '').split(/\s+/).filter(Boolean);

/** Platform admin › Global catalog: attributes, brands, HSN / tax classes and every product across stores */
@Injectable()
export class CatalogAdminService {
  constructor(private readonly prisma: PrismaService) {}

  private paging(q: { page?: number; pageSize?: number }, fallback = 10) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? fallback;
    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
  }

  // ───────────── Attributes ─────────────

  async attributes() {
    const rows = await this.prisma.categoryAttribute.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      select: { id: true, name: true, values: true, isActive: true, createdAt: true, updatedAt: true, category: { select: { id: true, name: true } } },
    });
    return { data: rows };
  }

  private async checkAttribute(name: string, categoryId: string | null, excludeId?: string) {
    if (categoryId) {
      const cat = await this.prisma.productCategory.findUnique({ where: { id: categoryId }, select: { parentId: true } });
      if (!cat) throw new BadRequestException('Category not found');
      if (cat.parentId) throw new BadRequestException('Pick a top-level category');
    }
    const clash = await this.prisma.categoryAttribute.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, categoryId, ...(excludeId && { NOT: { id: excludeId } }) },
      select: { id: true },
    });
    if (clash) throw new ConflictException(`“${name}” already exists for ${categoryId ? 'this category' : 'all categories'}`);
  }

  async createAttribute(dto: AttributeDto) {
    if (!dto.values.length) throw new BadRequestException('Add at least one value');
    const categoryId = dto.categoryId ?? null;
    await this.checkAttribute(dto.name, categoryId);
    await this.prisma.categoryAttribute.create({ data: { name: dto.name, values: dto.values, categoryId } });
    return { message: 'Attribute added', ...(await this.attributes()) };
  }

  async updateAttribute(id: string, dto: UpdateAttributeDto) {
    const existing = await this.prisma.categoryAttribute.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Attribute not found');
    if (dto.values && !dto.values.length) throw new BadRequestException('Add at least one value');
    const name = dto.name ?? existing.name;
    const categoryId = dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;
    await this.checkAttribute(name, categoryId, id);
    await this.prisma.categoryAttribute.update({ where: { id }, data: { name, categoryId, ...(dto.values && { values: dto.values }) } });
    return { message: 'Attribute updated', ...(await this.attributes()) };
  }

  async setAttributeActive(id: string, dto: ActiveDto) {
    await this.prisma.categoryAttribute.update({ where: { id }, data: { isActive: dto.isActive } }).catch(() => { throw new NotFoundException('Attribute not found'); });
    return { message: dto.isActive ? 'Attribute reactivated' : 'Attribute deactivated', ...(await this.attributes()) };
  }

  // ───────────── Tax classes ─────────────

  async taxClasses() {
    const rows = await this.prisma.taxClass.findMany({
      orderBy: [{ isActive: 'desc' }, { hsnCode: 'asc' }],
      select: { id: true, hsnCode: true, description: true, gstRatePercent: true, isActive: true, _count: { select: { products: true } } },
    });
    return { data: rows.map(({ _count, gstRatePercent, ...t }) => ({ ...t, gstRatePercent: Number(gstRatePercent), productsCount: _count.products })) };
  }

  private async checkTax(hsnCode: string, rate: number, excludeId?: string) {
    const clash = await this.prisma.taxClass.findFirst({
      where: { hsnCode, gstRatePercent: rate, ...(excludeId && { NOT: { id: excludeId } }) }, select: { id: true },
    });
    if (clash) throw new ConflictException(`HSN ${hsnCode} at ${rate}% already exists`);
  }

  async createTaxClass(dto: TaxClassDto) {
    await this.checkTax(dto.hsnCode, dto.gstRatePercent);
    await this.prisma.taxClass.create({ data: dto });
    return { message: 'Tax class added', ...(await this.taxClasses()) };
  }

  async updateTaxClass(id: string, dto: UpdateTaxClassDto) {
    const existing = await this.prisma.taxClass.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Tax class not found');
    await this.checkTax(dto.hsnCode ?? existing.hsnCode, dto.gstRatePercent ?? Number(existing.gstRatePercent), id);
    await this.prisma.taxClass.update({ where: { id }, data: dto });
    return { message: 'Tax class updated', ...(await this.taxClasses()) };
  }

  async setTaxClassActive(id: string, dto: ActiveDto) {
    await this.prisma.taxClass.update({ where: { id }, data: { isActive: dto.isActive } }).catch(() => { throw new NotFoundException('Tax class not found'); });
    return {
      message: dto.isActive ? 'Tax class reactivated' : 'Tax class deactivated — sellers can’t pick it for new products; existing products keep it',
      ...(await this.taxClasses()),
    };
  }

  // ───────────── Brands ─────────────

  async brands(q: ListBrandsQueryDto) {
    const { page, pageSize, skip, take } = this.paging(q);
    const base: Prisma.BrandWhereInput = {
      AND: words(q.search).map((w) => ({ OR: [{ name: { contains: w, mode: 'insensitive' as const } }, { seller: { name: { contains: w, mode: 'insensitive' as const } } }] })),
    };
    const where: Prisma.BrandWhereInput = { ...base, ...(q.status && { isActive: q.status === 'ACTIVE' }) };
    const [rows, total, active, inactive] = await Promise.all([
      this.prisma.brand.findMany({
        where, orderBy: [{ name: 'asc' }], skip, take,
        select: { id: true, name: true, isActive: true, createdAt: true, seller: { select: { id: true, name: true, slug: true } }, _count: { select: { products: true } } },
      }),
      this.prisma.brand.count({ where }),
      this.prisma.brand.count({ where: { ...base, isActive: true } }),
      this.prisma.brand.count({ where: { ...base, isActive: false } }),
    ]);
    return {
      data: rows.map(({ _count, ...b }) => ({ ...b, productsCount: _count.products })),
      meta: { page, pageSize, total, counts: { ALL: active + inactive, ACTIVE: active, INACTIVE: inactive } },
    };
  }

  async setBrandActive(id: string, dto: ActiveDto) {
    const b = await this.prisma.brand.update({ where: { id }, data: { isActive: dto.isActive }, select: { name: true } })
      .catch(() => { throw new NotFoundException('Brand not found'); });
    return { message: dto.isActive ? `${b.name} reactivated` : `${b.name} deactivated — sellers can’t use it for new or edited products` };
  }

  // ───────────── Products (every store) ─────────────

  private readonly outOfStock: Prisma.ProductWhereInput = {
    OR: [
      { variants: { none: {} }, inventoryQty: { lte: 0 } },
      { variants: { some: {} }, NOT: { variants: { some: { inventoryQty: { gt: 0 } } } } },
    ],
  };

  private productFilter(filter?: string): Prisma.ProductWhereInput {
    switch (filter) {
      case 'ACTIVE': return { status: 'ACTIVE', adminBlockedAt: null };
      case 'INACTIVE': return { status: 'INACTIVE', adminBlockedAt: null };
      case 'FLAGGED': return { flaggedAt: { not: null } };
      case 'BLOCKED': return { adminBlockedAt: { not: null } };
      case 'OUT_OF_STOCK': return this.outOfStock;
      default: return {};
    }
  }

  async productsMeta() {
    const [sellers, categories] = await Promise.all([
      this.prisma.seller.findMany({ where: { products: { some: {} } }, orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.productCategory.findMany({ where: { parentId: null }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true } }),
    ]);
    return { data: { sellers, categories } };
  }

  async products(q: ListPlatformProductsQueryDto) {
    const { page, pageSize, skip, take } = this.paging(q);
    const base: Prisma.ProductWhereInput = {
      AND: [
        ...(q.sellerId ? [{ sellerId: q.sellerId }] : []),
        ...(q.categoryId ? [{ category: { OR: [{ id: q.categoryId }, { parentId: q.categoryId }] } }] : []),
        ...words(q.search).map((w) => ({
          OR: [
            { title: { contains: w, mode: 'insensitive' as const } },
            { sku: { contains: w, mode: 'insensitive' as const } },
            { seller: { name: { contains: w, mode: 'insensitive' as const } } },
            { brand: { name: { contains: w, mode: 'insensitive' as const } } },
          ],
        })),
      ],
    };
    const where: Prisma.ProductWhereInput = { AND: [base, this.productFilter(q.filter)] };

    const [rows, total, ...counts] = await Promise.all([
      this.prisma.product.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        select: {
          id: true, title: true, slug: true, sku: true, status: true, sellingPrice: true, inventoryQty: true, createdAt: true,
          flaggedAt: true, flagReason: true, adminBlockedAt: true, adminBlockReason: true, ratingAvg: true, ratingCount: true,
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1, select: { url: true } },
          seller: { select: { id: true, name: true, slug: true } },
          category: { select: { name: true, parent: { select: { name: true } } } },
          variants: { select: { price: true, inventoryQty: true } },
        },
      }),
      this.prisma.product.count({ where }),
      ...(['ALL', 'ACTIVE', 'INACTIVE', 'FLAGGED', 'BLOCKED', 'OUT_OF_STOCK'] as const).map((f) =>
        this.prisma.product.count({ where: { AND: [base, this.productFilter(f)] } })),
    ]);
    const [ALL, ACTIVE, INACTIVE, FLAGGED, BLOCKED, OUT_OF_STOCK] = counts;

    return {
      data: rows.map((p) => {
        const prices = p.variants.length ? p.variants.map((v) => Number(v.price)) : [Number(p.sellingPrice)];
        const stock = p.variants.length ? p.variants.reduce((n, v) => n + v.inventoryQty, 0) : p.inventoryQty;
        return {
          id: p.id, title: p.title, slug: p.slug, sku: p.sku, status: p.status, createdAt: p.createdAt,
          imageUrl: p.images[0]?.url ?? null,
          seller: p.seller,
          category: p.category.parent ? `${p.category.parent.name} › ${p.category.name}` : p.category.name,
          price: Math.min(...prices), priceMax: Math.max(...prices), variantCount: p.variants.length, stock,
          rating: { avg: Number(p.ratingAvg), count: p.ratingCount },
          moderation: { flagged: !!p.flaggedAt, flagReason: p.flagReason, flaggedAt: p.flaggedAt, blocked: !!p.adminBlockedAt, blockReason: p.adminBlockReason, blockedAt: p.adminBlockedAt },
        };
      }),
      meta: { page, pageSize, total, counts: { ALL, ACTIVE, INACTIVE, FLAGGED, BLOCKED, OUT_OF_STOCK } },
    };
  }

  async product(id: string) {
    const p = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, name: true, slug: true, status: true, logoUrl: true, brandColor: true } },
        category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
        brand: { select: { id: true, name: true, isActive: true } },
        taxClass: { select: { hsnCode: true, description: true, gstRatePercent: true } },
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], select: { id: true, url: true } },
        variants: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, sku: true, price: true, compareAtPrice: true, inventoryQty: true } },
        _count: { select: { reviews: true, cartItems: true, wishlistedBy: true } },
      },
    });
    if (!p) throw new NotFoundException('Product not found');
    const stock = p.variants.length ? p.variants.reduce((n, v) => n + v.inventoryQty, 0) : p.inventoryQty;
    return {
      data: {
        id: p.id, title: p.title, slug: p.slug, description: p.description, sku: p.sku, status: p.status,
        createdAt: p.createdAt, updatedAt: p.updatedAt, firstOrderedAt: p.firstOrderedAt,
        seller: p.seller,
        category: { id: p.category.id, name: p.category.name, parent: p.category.parent },
        brand: p.brand,
        tax: { hsnCode: p.taxClass.hsnCode, description: p.taxClass.description, gstRatePercent: Number(p.taxClass.gstRatePercent) },
        price: Number(p.sellingPrice), compareAtPrice: num(p.compareAtPrice),
        stock, lowStockThreshold: p.lowStockThreshold,
        images: p.images,
        variants: p.variants.map((v) => ({ ...v, price: Number(v.price), compareAtPrice: num(v.compareAtPrice) })),
        delivery: { packageType: p.packageType, weightKg: num(p.weightKg), requiresColdChain: p.requiresColdChain, scope: p.deliveryScope, pincodes: p.deliveryPincodes },
        rating: { avg: Number(p.ratingAvg), count: p.ratingCount },
        counts: { reviews: p._count.reviews, inCarts: p._count.cartItems, inWishlists: p._count.wishlistedBy },
        moderation: { flagged: !!p.flaggedAt, flagReason: p.flagReason, flaggedAt: p.flaggedAt, blocked: !!p.adminBlockedAt, blockReason: p.adminBlockReason, blockedAt: p.adminBlockedAt },
      },
    };
  }

  async flagProduct(id: string, dto: FlagProductDto) {
    await this.prisma.product.update({
      where: { id },
      data: dto.flagged ? { flaggedAt: new Date(), flagReason: dto.reason } : { flaggedAt: null, flagReason: null },
    }).catch(() => { throw new NotFoundException('Product not found'); });
    return { message: dto.flagged ? 'Listing flagged — the seller sees your note' : 'Flag cleared', ...(await this.product(id)) };
  }

  /** Block = take the listing down (hidden from shoppers, carts, wishlists); unblock puts it back live */
  async blockProduct(id: string, dto: BlockProductDto) {
    await this.prisma.product.update({
      where: { id },
      data: dto.blocked
        ? { adminBlockedAt: new Date(), adminBlockReason: dto.reason, status: 'INACTIVE' }
        : { adminBlockedAt: null, adminBlockReason: null, status: 'ACTIVE' },
    }).catch(() => { throw new NotFoundException('Product not found'); });
    return { message: dto.blocked ? 'Listing deactivated — hidden from shoppers' : 'Listing reactivated', ...(await this.product(id)) };
  }
}
