import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImageKitStorageService } from '../sellers/imagekit-storage.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { HomeProductSource } from '../generated/prisma/enums.js';
import {
  CreateBannerDto, CreateSectionDto, ProductPickerQueryDto, PromoCardDto, StorefrontSettingsDto, UpdateBannerDto, UpdateSectionDto,
} from './dto/storefront.dto.js';

const SETTINGS_ID = 'default';

export type PromoCard = { tag: string | null; title: string; linkUrl: string | null; theme: PromoCardDto['theme'] };

/** Only products a shopper may see: active product, active seller, active (sub-)category */
const visibleProduct = {
  status: 'ACTIVE',
  seller: { status: 'ACTIVE' },
  category: { isActive: true, OR: [{ parentId: null }, { parent: { isActive: true } }] },
} satisfies Prisma.ProductWhereInput;

const cardInclude = {
  seller: { select: { name: true, slug: true } },
  images: { select: { url: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
  variants: { select: { price: true, compareAtPrice: true, inventoryQty: true }, orderBy: { sortOrder: 'asc' } },
} satisfies Prisma.ProductInclude;

type CardRow = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  seller: { name: string; slug: string };
  price: number;
  /** Compare-at price (MRP) when higher than price */
  mrp: number | null;
  discountPercent: number;
  inStock: boolean;
  hasVariants: boolean;
}

/** Card price = cheapest variant (or the base price) with its own compare-at price */
export function toCard(p: CardRow): ProductCard {
  const options = p.variants.length
    ? p.variants.map((v) => ({ price: Number(v.price), mrp: v.compareAtPrice == null ? null : Number(v.compareAtPrice), qty: v.inventoryQty }))
    : [{ price: Number(p.sellingPrice), mrp: p.compareAtPrice == null ? null : Number(p.compareAtPrice), qty: p.inventoryQty }];
  const cheapest = options.reduce((a, b) => (b.price < a.price ? b : a));
  const mrp = cheapest.mrp != null && cheapest.mrp > cheapest.price ? cheapest.mrp : null;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    imageUrl: p.images[0]?.url ?? null,
    seller: p.seller,
    price: cheapest.price,
    mrp,
    discountPercent: mrp ? Math.round(((mrp - cheapest.price) / mrp) * 100) : 0,
    inStock: options.some((o) => o.qty > 0),
    hasVariants: p.variants.length > 0,
  };
}

@Injectable()
export class StorefrontService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageKitStorageService,
  ) { }

  // ───────────── Settings ─────────────

  async getSettings() {
    return this.prisma.storefrontSettings.upsert({ where: { id: SETTINGS_ID }, create: { id: SETTINGS_ID }, update: {} });
  }

  async updateSettings(dto: StorefrontSettingsDto) {
    const data = await this.prisma.storefrontSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, ...dto },
      update: dto,
    });
    return { success: true, message: 'Banner settings saved', data };
  }

  // ───────────── Banners ─────────────

  listBanners() {
    return this.prisma.homeBanner.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  uploadAuth() {
    return this.storage.getUploadAuth('banner');
  }

  private assertSchedule(startsAt?: Date | null, endsAt?: Date | null) {
    if (startsAt && endsAt && endsAt <= startsAt) throw new BadRequestException('End date must be after the start date');
  }

  async createBanner(dto: CreateBannerDto) {
    this.assertSchedule(dto.startsAt, dto.endsAt);
    const file = await this.storage.verify(dto.imageFileId, 'banner');
    const last = await this.prisma.homeBanner.aggregate({ _max: { sortOrder: true } });
    const data = await this.prisma.homeBanner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        ctaLabel: dto.ctaLabel ?? null,
        linkUrl: dto.linkUrl ?? null,
        imageFileId: file.fileId,
        imageUrl: file.url!,
        isActive: dto.isActive ?? true,
        startsAt: dto.startsAt ?? null,
        endsAt: dto.endsAt ?? null,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    return { success: true, message: 'Banner added', data };
  }

  async updateBanner(id: string, dto: UpdateBannerDto) {
    const existing = await this.prisma.homeBanner.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Banner not found');
    this.assertSchedule(
      dto.startsAt !== undefined ? dto.startsAt : existing.startsAt,
      dto.endsAt !== undefined ? dto.endsAt : existing.endsAt,
    );
    const { imageFileId, ...rest } = dto;
    let image: { imageFileId: string; imageUrl: string } | undefined;
    if (imageFileId && imageFileId !== existing.imageFileId) {
      const file = await this.storage.verify(imageFileId, 'banner');
      image = { imageFileId: file.fileId, imageUrl: file.url! };
    }
    const data = await this.prisma.homeBanner.update({ where: { id }, data: { ...rest, ...image } });
    return { success: true, message: 'Banner saved', data };
  }

  async setBannerActive(id: string, isActive: boolean) {
    await this.findBanner(id);
    const data = await this.prisma.homeBanner.update({ where: { id }, data: { isActive } });
    return { success: true, message: isActive ? 'Banner shown' : 'Banner hidden', data };
  }

  async deleteBanner(id: string) {
    await this.findBanner(id);
    await this.prisma.homeBanner.delete({ where: { id } });
    return { success: true, message: 'Banner deleted' };
  }

  async reorderBanners(ids: string[]) {
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.homeBanner.updateMany({ where: { id }, data: { sortOrder: i } })));
    return { success: true, message: 'Order saved' };
  }

  private async findBanner(id: string) {
    const b = await this.prisma.homeBanner.findUnique({ where: { id }, select: { id: true } });
    if (!b) throw new NotFoundException('Banner not found');
    return b;
  }

  // ───────────── Sections ─────────────

  async listSections() {
    const rows = await this.prisma.homeSection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        category: { select: { id: true, name: true, parent: { select: { name: true } } } },
        _count: { select: { products: true } },
      },
    });
    return rows.map(({ _count, ...s }) => ({ ...s, pickedCount: _count.products }));
  }

  async getSection(id: string) {
    const s = await this.prisma.homeSection.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, parent: { select: { name: true } } } },
        products: { orderBy: { sortOrder: 'asc' }, include: { product: { include: cardInclude } } },
      },
    });
    if (!s) throw new NotFoundException('Section not found');
    const { products, ...rest } = s;
    return { ...rest, products: products.map((p) => toCard(p.product)) };
  }

  /** Normalises a section payload and checks every reference exists */
  private async resolveSection(type: 'SHOP_BY_CATEGORY' | 'PRODUCTS' | 'PROMO_CARDS', dto: UpdateSectionDto) {
    if (type === 'PROMO_CARDS') {
      const cards = (dto.cards ?? []).map((c) => ({ tag: c.tag ?? null, title: c.title, linkUrl: c.linkUrl ?? null, theme: c.theme }));
      if (!cards.length) throw new BadRequestException('Add at least one card');
      return { source: null, categoryId: null, categoryIds: [] as string[], productIds: [] as string[], cards };
    }
    if (type === 'SHOP_BY_CATEGORY') {
      const ids = [...new Set(dto.categoryIds ?? [])];
      if (ids.length) {
        const found = await this.prisma.productCategory.count({ where: { id: { in: ids }, parentId: null } });
        if (found !== ids.length) throw new BadRequestException('Pick top-level categories only');
      }
      return { source: null, categoryId: null, categoryIds: ids, productIds: [] as string[], cards: [] as PromoCard[] };
    }

    const source = dto.source;
    if (!source) throw new BadRequestException('Choose which products this section shows');
    let categoryId: string | null = null;
    if (source === 'CATEGORY') {
      if (!dto.categoryId) throw new BadRequestException('Choose a category for this section');
      const cat = await this.prisma.productCategory.findUnique({ where: { id: dto.categoryId }, select: { id: true } });
      if (!cat) throw new BadRequestException('Category not found');
      categoryId = cat.id;
    }
    let productIds: string[] = [];
    if (source === 'MANUAL') {
      productIds = [...new Set(dto.productIds ?? [])];
      if (!productIds.length) throw new BadRequestException('Pick at least one product');
      const found = await this.prisma.product.count({ where: { id: { in: productIds } } });
      if (found !== productIds.length) throw new BadRequestException('Some picked products no longer exist');
    }
    return { source, categoryId, categoryIds: [] as string[], productIds, cards: [] as PromoCard[] };
  }

  async createSection(dto: CreateSectionDto) {
    const r = await this.resolveSection(dto.type, dto);
    const last = await this.prisma.homeSection.aggregate({ _max: { sortOrder: true } });
    const created = await this.prisma.homeSection.create({
      data: {
        type: dto.type,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        source: r.source,
        categoryId: r.categoryId,
        categoryIds: r.categoryIds,
        cards: r.cards as Prisma.InputJsonValue,
        productLimit: dto.productLimit ?? 12,
        isActive: dto.isActive ?? true,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
        products: { create: r.productIds.map((productId, i) => ({ productId, sortOrder: i })) },
      },
    });
    return { success: true, message: 'Section added', data: await this.getSection(created.id) };
  }

  async updateSection(id: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.homeSection.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Section not found');
    if (dto.type && dto.type !== existing.type) throw new BadRequestException('A section’s type can’t be changed');

    // Re-resolve with the stored values filling any gaps
    const r = await this.resolveSection(existing.type, {
      source: dto.source ?? existing.source ?? undefined,
      categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
      categoryIds: dto.categoryIds ?? existing.categoryIds,
      cards: dto.cards ?? (existing.cards as unknown as PromoCard[]),
      productIds: dto.productIds ?? (await this.prisma.homeSectionProduct.findMany({
        where: { sectionId: id }, orderBy: { sortOrder: 'asc' }, select: { productId: true },
      })).map((p) => p.productId),
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.homeSection.update({
        where: { id },
        data: {
          title: dto.title,
          subtitle: dto.subtitle,
          productLimit: dto.productLimit,
          isActive: dto.isActive,
          source: r.source,
          categoryId: r.categoryId,
          categoryIds: r.categoryIds,
          cards: r.cards as Prisma.InputJsonValue,
        },
      });
      await tx.homeSectionProduct.deleteMany({ where: { sectionId: id } });
      if (r.productIds.length) {
        await tx.homeSectionProduct.createMany({ data: r.productIds.map((productId, i) => ({ sectionId: id, productId, sortOrder: i })) });
      }
    });
    return { success: true, message: 'Section saved', data: await this.getSection(id) };
  }

  async setSectionActive(id: string, isActive: boolean) {
    await this.findSection(id);
    const data = await this.prisma.homeSection.update({ where: { id }, data: { isActive } });
    return { success: true, message: isActive ? 'Section shown' : 'Section hidden', data };
  }

  async deleteSection(id: string) {
    await this.findSection(id);
    await this.prisma.homeSection.delete({ where: { id } });
    return { success: true, message: 'Section deleted' };
  }

  async reorderSections(ids: string[]) {
    await this.prisma.$transaction(ids.map((id, i) => this.prisma.homeSection.updateMany({ where: { id }, data: { sortOrder: i } })));
    return { success: true, message: 'Order saved' };
  }

  private async findSection(id: string) {
    const s = await this.prisma.homeSection.findUnique({ where: { id }, select: { id: true } });
    if (!s) throw new NotFoundException('Section not found');
    return s;
  }

  /** Admin product picker across every seller (shows only shopper-visible products) */
  async pickProducts(query: ProductPickerQueryDto) {
    const q = query.q?.trim();
    const rows = await this.prisma.product.findMany({
      where: {
        ...visibleProduct,
        AND: [
          q ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { seller: { name: { contains: q, mode: 'insensitive' } } },
            ],
          } : {},
          query.categoryId ? { OR: [{ categoryId: query.categoryId }, { category: { parentId: query.categoryId } }] } : {},
        ],
      },
      include: cardInclude,
      orderBy: { updatedAt: 'desc' },
      take: 30,
    });
    return rows.map(toCard);
  }

  /** Categories for the admin pickers (top-level with their sub-categories) */
  async categoryOptions() {
    return this.prisma.productCategory.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, isActive: true,
        children: { orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, isActive: true } },
      },
    });
  }

  // ───────────── Public (customer storefront) ─────────────

  /** Products for a section source */
  async productsFor(source: HomeProductSource, opts: { categoryId?: string | null; sectionId?: string; limit: number }): Promise<ProductCard[]> {
    const limit = Math.min(Math.max(opts.limit, 1), 40);

    if (source === 'MANUAL') {
      if (!opts.sectionId) return [];
      const picks = await this.prisma.homeSectionProduct.findMany({
        where: { sectionId: opts.sectionId, product: visibleProduct },
        orderBy: { sortOrder: 'asc' },
        take: limit,
        include: { product: { include: cardInclude } },
      });
      return picks.map((p) => toCard(p.product));
    }

    if (source === 'DEALS') {
      // Discount is computed per card, so rank a pool of discounted products
      const pool = await this.prisma.product.findMany({
        where: {
          ...visibleProduct,
          OR: [{ compareAtPrice: { not: null } }, { variants: { some: { compareAtPrice: { not: null } } } }],
        },
        include: cardInclude,
        orderBy: { updatedAt: 'desc' },
        take: 200,
      });
      return pool.map(toCard).filter((c) => c.discountPercent > 0)
        .sort((a, b) => b.discountPercent - a.discountPercent)
        .slice(0, limit);
    }

    const where: Prisma.ProductWhereInput = { ...visibleProduct };
    if (source === 'CATEGORY') {
      if (!opts.categoryId) return [];
      where.AND = [{ OR: [{ categoryId: opts.categoryId }, { category: { parentId: opts.categoryId } }] }];
    }
    // TRENDING: ranked by recent orders once checkout exists; until then, most recently ordered first, then newest
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = source === 'TRENDING'
      ? [{ firstOrderedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];
    const rows = await this.prisma.product.findMany({ where, include: cardInclude, orderBy, take: limit });
    return rows.map(toCard);
  }

  /** Top-level categories with how many visible products they hold */
  async publicCategories(ids?: string[]) {
    const cats = await this.prisma.productCategory.findMany({
      where: { parentId: null, isActive: true, ...(ids?.length && { id: { in: ids } }) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true, name: true, slug: true, description: true,
        children: { where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, slug: true } },
      },
    });
    const counts = await this.prisma.product.groupBy({
      by: ['categoryId'],
      where: visibleProduct,
      _count: { _all: true },
    });
    const subToParent = new Map(cats.flatMap((c) => c.children.map((s) => [s.id, c.id] as const)));
    const total = new Map<string, number>();
    for (const row of counts) {
      const parent = subToParent.get(row.categoryId) ?? row.categoryId;
      total.set(parent, (total.get(parent) ?? 0) + row._count._all);
    }
    const out = cats.map((c) => ({ ...c, productsCount: total.get(c.id) ?? 0 }));
    // Keep the admin's chosen order
    return ids?.length ? ids.map((id) => out.find((c) => c.id === id)).filter((c) => !!c) : out;
  }

  /** Everything the customer home page renders, in one call */
  async publicHome() {
    const now = new Date();
    const [settings, banners, sections] = await Promise.all([
      this.getSettings(),
      this.prisma.homeBanner.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: { id: true, title: true, subtitle: true, ctaLabel: true, linkUrl: true, imageUrl: true },
      }),
      this.prisma.homeSection.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { category: { select: { slug: true, isActive: true } } },
      }),
    ]);

    const rendered = await Promise.all(sections.map(async (s) => {
      const base = { id: s.id, type: s.type, title: s.title, subtitle: s.subtitle };
      if (s.type === 'PROMO_CARDS') {
        const cards = (s.cards as unknown as PromoCard[]) ?? [];
        return cards.length ? { ...base, cards, viewAllHref: null } : null;
      }
      if (s.type === 'SHOP_BY_CATEGORY') {
        const categories = await this.publicCategories(s.categoryIds);
        return categories.length ? { ...base, categories, viewAllHref: null } : null;
      }
      if (!s.source || (s.source === 'CATEGORY' && !s.category?.isActive)) return null;
      const products = await this.productsFor(s.source, { categoryId: s.categoryId, sectionId: s.id, limit: s.productLimit });
      if (!products.length) return null; // never show an empty row
      const viewAllHref = s.source === 'CATEGORY' ? `/category/${s.category!.slug}` : s.source === 'MANUAL' ? null : `/products?sort=${s.source.toLowerCase()}`;
      return { ...base, source: s.source, products, viewAllHref };
    }));

    return {
      banners: {
        mode: settings.bannerMode,
        autoplaySeconds: settings.autoplaySeconds,
        items: settings.bannerMode === 'SINGLE' ? banners.slice(0, 1) : banners,
      },
      sections: rendered.filter((s) => s !== null),
    };
  }

  /** Full product page for shoppers: /p/<sellerSlug>/<productSlug> */
  async publicProduct(sellerSlug: string, slug: string) {
    const p = await this.prisma.product.findFirst({
      where: { ...visibleProduct, slug, seller: { slug: sellerSlug, status: 'ACTIVE' } },
      include: {
        seller: { select: { id: true, name: true, slug: true, logoUrl: true, brandColor: true, categories: { select: { category: { select: { name: true } } } } } },
        brand: { select: { name: true } },
        category: { select: { id: true, name: true, slug: true, parent: { select: { id: true, name: true, slug: true } } } },
        images: { select: { id: true, url: true }, orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: { select: { id: true, name: true, price: true, compareAtPrice: true, inventoryQty: true }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!p) throw new NotFoundException('Product not found');

    const money = (d: Prisma.Decimal | null) => (d == null ? null : Number(d));
    // Shoppers see availability, not exact stock beyond a small "only N left" hint
    const stockHint = (qty: number) => (qty <= 0 ? 0 : Math.min(qty, 10));
    const variants = p.variants.map((v) => ({
      id: v.id, name: v.name, price: Number(v.price), mrp: money(v.compareAtPrice), inStock: v.inventoryQty > 0, maxQty: stockHint(v.inventoryQty),
      lowStock: v.inventoryQty > 0 && v.inventoryQty <= p.lowStockThreshold,
    }));

    const related = await this.prisma.product.findMany({
      where: { ...visibleProduct, id: { not: p.id }, OR: [{ categoryId: p.categoryId }, ...(p.category.parent ? [{ category: { parentId: p.category.parent.id } }] : [])] },
      include: cardInclude,
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      seo: { title: p.seoTitle, description: p.seoDescription },
      brand: p.brand?.name ?? null,
      seller: { name: p.seller.name, slug: p.seller.slug, logoUrl: p.seller.logoUrl, brandColor: p.seller.brandColor, categories: p.seller.categories.map((c) => c.category.name) },
      category: { name: p.category.name, slug: p.category.slug },
      parentCategory: p.category.parent ? { name: p.category.parent.name, slug: p.category.parent.slug } : null,
      images: p.images,
      price: Number(p.sellingPrice),
      mrp: money(p.compareAtPrice),
      inStock: p.inventoryQty > 0,
      maxQty: stockHint(p.inventoryQty),
      lowStock: p.inventoryQty > 0 && p.inventoryQty <= p.lowStockThreshold,
      variants,
      specs: {
        sku: p.sku,
        weightKg: money(p.weightKg),
        packageType: p.packageType,
        requiresColdChain: p.requiresColdChain,
      },
      delivery: { scope: p.deliveryScope, pincodes: p.deliveryScope === 'SPECIFIC_PINCODES' ? p.deliveryPincodes : [] },
      related: related.map(toCard),
    };
  }

  /** Product listing for "View all" and category pages */
  async publicProducts(params: { category?: string; sort?: string; q?: string }) {
    const q = params.q?.trim().slice(0, 100);
    if (q) {
      const rows = await this.prisma.product.findMany({
        where: {
          ...visibleProduct,
          AND: [{
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { brand: { name: { contains: q, mode: 'insensitive' } } },
              { seller: { name: { contains: q, mode: 'insensitive' } } },
              { category: { name: { contains: q, mode: 'insensitive' } } },
            ],
          }],
        },
        include: cardInclude,
        orderBy: { createdAt: 'desc' },
        take: 60,
      });
      const cards = rows.map(toCard);
      const sort = (params.sort ?? '').toUpperCase();
      if (sort === 'DEALS') cards.sort((a, b) => b.discountPercent - a.discountPercent);
      return { category: null, sort: sort || 'LATEST', q, products: cards };
    }

    let category: { id: string; name: string; slug: string; description: string | null } | null = null;
    if (params.category) {
      category = await this.prisma.productCategory.findFirst({
        where: { slug: params.category, isActive: true },
        select: { id: true, name: true, slug: true, description: true },
      });
      if (!category) throw new NotFoundException('Category not found');
    }
    const sort = (params.sort ?? '').toUpperCase();
    const source: HomeProductSource = category ? 'CATEGORY' : sort === 'DEALS' || sort === 'TRENDING' ? sort : 'LATEST';
    const products = await this.productsFor(source, { categoryId: category?.id, limit: 40 });
    const sorted = category && sort === 'DEALS' ? [...products].sort((a, b) => b.discountPercent - a.discountPercent) : products;
    return { category, sort: category ? (sort || 'LATEST') : source, products: sorted };
  }
}
