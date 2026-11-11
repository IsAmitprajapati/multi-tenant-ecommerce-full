import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ImageKitStorageService } from '../sellers/imagekit-storage.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

const FALLBACK_COMMISSION_RATE = 10;

const slugify = (v: string) =>
  v.toLowerCase().normalize('NFKD').replace(/&/g, 'and').replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'category';

/**
 * Global catalog: product categories (top level — what sellers choose at onboarding)
 * and sub-categories (what products are filed under). Managed by the platform admin.
 */
@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ImageKitStorageService,
  ) { }

  uploadAuth(kind: 'image' | 'icon' = 'image') {
    return { data: this.storage.getUploadAuth(kind === 'icon' ? 'categoryIcon' : 'category') };
  }

  /** undefined = leave as is, null = remove, string = verify the new upload */
  private async resolveImage(fileId: string | null | undefined, currentFileId?: string | null) {
    if (fileId === undefined || fileId === currentFileId) return {};
    if (fileId === null) return { imageFileId: null, imageUrl: null };
    const file = await this.storage.verify(fileId, 'category');
    return { imageFileId: file.fileId, imageUrl: file.url };
  }

  private async resolveIcon(fileId: string | null | undefined, currentFileId?: string | null) {
    if (fileId === undefined || fileId === currentFileId) return {};
    if (fileId === null) return { iconFileId: null, iconUrl: null };
    const file = await this.storage.verify(fileId, 'categoryIcon');
    return { iconFileId: file.fileId, iconUrl: file.url };
  }

  private serialize<T extends { defaultCommissionRate: unknown }>(c: T) {
    return { ...c, defaultCommissionRate: c.defaultCommissionRate == null ? null : Number(c.defaultCommissionRate) };
  }

  /** Full tree with usage counts */
  async list() {
    const tops = await this.prisma.productCategory.findMany({
      where: { parentId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { sellerCategories: true } },
        children: {
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: { _count: { select: { products: true } } },
        },
      },
    });
    return {
      data: tops.map(({ _count, children, ...t }) => ({
        ...this.serialize(t),
        sellersCount: _count.sellerCategories,
        productsCount: children.reduce((sum, c) => sum + c._count.products, 0),
        children: children.map(({ _count: cc, ...c }) => ({ ...this.serialize(c), productsCount: cc.products })),
      })),
    };
  }

  async get(id: string) {
    const c = await this.prisma.productCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { sellerCategories: true, products: true, children: true } },
      },
    });
    if (!c) throw new NotFoundException('Category not found');
    const { _count, ...rest } = c;
    return { data: { ...this.serialize(rest), sellersCount: _count.sellerCategories, productsCount: _count.products, childrenCount: _count.children } };
  }

  /** Names are unique among siblings (case-insensitive) */
  private async assertNameFree(name: string, parentId: string | null, exceptId?: string) {
    const clash = await this.prisma.productCategory.findFirst({
      where: { parentId, name: { equals: name, mode: 'insensitive' }, ...(exceptId && { NOT: { id: exceptId } }) },
      select: { id: true },
    });
    if (clash) throw new ConflictException({ statusCode: 409, field: 'name', message: parentId ? 'This category already has a sub-category with that name' : 'A category with that name already exists' });
  }

  private async uniqueSlug(base: string) {
    let slug = base;
    for (let i = 2; await this.prisma.productCategory.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base}-${i}`;
    return slug;
  }

  async create(dto: CreateCategoryDto) {
    const parent = dto.parentId
      ? await this.prisma.productCategory.findUnique({ where: { id: dto.parentId }, select: { id: true, slug: true, parentId: true, requiresFssai: true } })
      : null;
    if (dto.parentId && !parent) throw new BadRequestException('Parent category not found');
    if (parent?.parentId) throw new BadRequestException('Sub-categories can’t have their own sub-categories');
    await this.assertNameFree(dto.name, parent?.id ?? null);

    const last = await this.prisma.productCategory.findFirst({ where: { parentId: parent?.id ?? null }, orderBy: { sortOrder: 'desc' }, select: { sortOrder: true } });
    const image = { ...(await this.resolveImage(dto.imageFileId)), ...(await this.resolveIcon(dto.iconFileId)) };
    const created = await this.prisma.productCategory.create({
      data: {
        name: dto.name,
        description: dto.description || null,
        slug: await this.uniqueSlug(parent ? `${parent.slug}-${slugify(dto.name)}` : slugify(dto.name)),
        parentId: parent?.id ?? null,
        // Commission + FSSAI live on the top level; sub-categories inherit FSSAI for display
        defaultCommissionRate: parent ? null : (dto.defaultCommissionRate ?? FALLBACK_COMMISSION_RATE),
        requiresFssai: parent ? parent.requiresFssai : (dto.requiresFssai ?? false),
        isActive: dto.isActive ?? true,
        sortOrder: dto.sortOrder ?? (last ? last.sortOrder + 1 : 0),
        ...image,
      },
      select: { id: true },
    });
    return { success: true, message: parent ? 'Sub-category created' : 'Category created', data: (await this.get(created.id)).data };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.productCategory.findUnique({ where: { id }, select: { id: true, parentId: true, imageFileId: true, iconFileId: true } });
    if (!existing) throw new NotFoundException('Category not found');
    if (dto.name) await this.assertNameFree(dto.name, existing.parentId, id);
    const image = { ...(await this.resolveImage(dto.imageFileId, existing.imageFileId)), ...(await this.resolveIcon(dto.iconFileId, existing.iconFileId)) };
    const isTop = !existing.parentId;

    await this.prisma.$transaction(async (tx) => {
      await tx.productCategory.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description || null }),
          ...(isTop && dto.defaultCommissionRate !== undefined && { defaultCommissionRate: dto.defaultCommissionRate }),
          ...(isTop && dto.requiresFssai !== undefined && { requiresFssai: dto.requiresFssai }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
          ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
          ...image,
        },
      });
      // Keep sub-categories' FSSAI flag in step with their parent
      if (isTop && dto.requiresFssai !== undefined) {
        await tx.productCategory.updateMany({ where: { parentId: id }, data: { requiresFssai: dto.requiresFssai } });
      }
    });
    return { success: true, message: 'Category saved', data: (await this.get(id)).data };
  }

  async setStatus(id: string, isActive: boolean) {
    await this.get(id);
    await this.prisma.productCategory.update({ where: { id }, data: { isActive } });
    return {
      success: true,
      message: isActive ? 'Category activated' : 'Category hidden — existing sellers and products keep it, but it can’t be chosen for new ones',
      data: (await this.get(id)).data,
    };
  }

  /** Delete only when nothing uses it — otherwise deactivate */
  async remove(id: string) {
    const { data: c } = await this.get(id);
    const reasons = [
      c.childrenCount && `${c.childrenCount} sub-categor${c.childrenCount === 1 ? 'y' : 'ies'}`,
      c.sellersCount && `${c.sellersCount} seller${c.sellersCount === 1 ? '' : 's'}`,
      c.productsCount && `${c.productsCount} product${c.productsCount === 1 ? '' : 's'}`,
    ].filter(Boolean);
    if (reasons.length) {
      throw new ConflictException(`Can’t delete — it’s used by ${reasons.join(', ')}. Deactivate it instead.`);
    }
    await this.prisma.productCategory.delete({ where: { id } });
    return { success: true, message: 'Category deleted' };
  }

  /** Public: active top-level categories with default commission (seller landing page) */
  async publicSellerCategories() {
    const rows = await this.prisma.productCategory.findMany({
      where: { parentId: null, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { name: true, description: true, defaultCommissionRate: true, requiresFssai: true },
    });
    return { data: rows.map((r) => ({ ...r, defaultCommissionRate: Number(r.defaultCommissionRate ?? FALLBACK_COMMISSION_RATE) })) };
  }
}
