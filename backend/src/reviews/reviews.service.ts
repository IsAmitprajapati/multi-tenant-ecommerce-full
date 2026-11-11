import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { ListReviewsQueryDto, UpsertReviewDto } from './dto/review.dto.js';

const DEFAULT_PAGE_SIZE = 10;

/** Shoppers see "Amit P." — never a full surname or email */
export const displayName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Customer';
  return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.` : parts[0]!;
};

const reviewSelect = {
  id: true, rating: true, title: true, body: true, createdAt: true, updatedAt: true, userId: true,
  user: { select: { fullName: true } },
} satisfies Prisma.ProductReviewSelect;

type ReviewRow = Prisma.ProductReviewGetPayload<{ select: typeof reviewSelect }>;

const serialize = (r: ReviewRow) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  createdAt: r.createdAt,
  edited: r.updatedAt.getTime() - r.createdAt.getTime() > 60_000,
  author: displayName(r.user.fullName),
});

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) { }

  /** Products shoppers can see (and therefore review) */
  private async findVisibleProduct(where: Prisma.ProductWhereInput) {
    const p = await this.prisma.product.findFirst({
      where: { ...where, status: 'ACTIVE', seller: { status: 'ACTIVE' } },
      select: { id: true, ratingAvg: true, ratingCount: true },
    });
    if (!p) throw new NotFoundException('Product not found');
    return p;
  }

  /** Recomputes a product's average and count from its published reviews */
  private async refreshAggregate(tx: Prisma.TransactionClient, productId: string) {
    const agg = await tx.productReview.aggregate({
      where: { productId, status: 'PUBLISHED' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { ratingAvg: Math.round((agg._avg.rating ?? 0) * 100) / 100, ratingCount: agg._count._all },
    });
  }

  /** Public: summary + one page of reviews for /p/<seller>/<slug> */
  async listForProduct(sellerSlug: string, slug: string, q: ListReviewsQueryDto) {
    const product = await this.findVisibleProduct({ slug, seller: { slug: sellerSlug } });
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? DEFAULT_PAGE_SIZE;
    const where: Prisma.ProductReviewWhereInput = { productId: product.id, status: 'PUBLISHED', ...(q.rating && { rating: q.rating }) };
    const orderBy: Prisma.ProductReviewOrderByWithRelationInput[] =
      q.sort === 'highest' ? [{ rating: 'desc' }, { createdAt: 'desc' }]
        : q.sort === 'lowest' ? [{ rating: 'asc' }, { createdAt: 'desc' }]
          : [{ createdAt: 'desc' }];

    const [rows, total, groups] = await Promise.all([
      this.prisma.productReview.findMany({ where, orderBy, select: reviewSelect, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.productReview.count({ where }),
      this.prisma.productReview.groupBy({ by: ['rating'], where: { productId: product.id, status: 'PUBLISHED' }, _count: { _all: true } }),
    ]);
    const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: groups.find((g) => g.rating === stars)?._count._all ?? 0 }));

    return {
      productId: product.id,
      summary: { average: Number(product.ratingAvg), count: product.ratingCount, distribution },
      items: rows.map(serialize),
      page,
      pageSize,
      total,
      hasMore: page * pageSize < total,
    };
  }

  private assertCustomer(user: JwtAccessPayload) {
    if (user.userType !== 'CUSTOMER') throw new ForbiddenException('Only shopper accounts can write reviews');
  }

  /** The signed-in shopper's own review of a product (or null) */
  async mine(user: JwtAccessPayload, productId: string) {
    const r = await this.prisma.productReview.findUnique({ where: { productId_userId: { productId, userId: user.userId } }, select: reviewSelect });
    return { data: r ? serialize(r) : null };
  }

  /** Create or update the shopper's review (one per product) */
  async upsert(user: JwtAccessPayload, productId: string, dto: UpsertReviewDto) {
    this.assertCustomer(user);
    await this.findVisibleProduct({ id: productId });
    const data = { rating: dto.rating, title: dto.title ?? null, body: dto.body };

    const review = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.productReview.findUnique({ where: { productId_userId: { productId, userId: user.userId } }, select: { id: true, status: true } });
      const r = existing
        ? await tx.productReview.update({ where: { id: existing.id }, data, select: reviewSelect })
        : await tx.productReview.create({ data: { ...data, productId, userId: user.userId }, select: reviewSelect });
      await this.refreshAggregate(tx, productId);
      return { r, created: !existing };
    });
    return { success: true, message: review.created ? 'Thanks — your review is live' : 'Review updated', data: serialize(review.r) };
  }

  async remove(user: JwtAccessPayload, id: string) {
    const r = await this.prisma.productReview.findUnique({ where: { id }, select: { id: true, userId: true, productId: true } });
    if (!r || r.userId !== user.userId) throw new NotFoundException('Review not found');
    await this.prisma.$transaction(async (tx) => {
      await tx.productReview.delete({ where: { id } });
      await this.refreshAggregate(tx, r.productId);
    });
    return { success: true, message: 'Review deleted' };
  }
}
