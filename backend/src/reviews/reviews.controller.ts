import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtAccessPayload } from '../auth/types/jwt-payload.type.js';
import { ReviewsService } from './reviews.service.js';
import { ListReviewsQueryDto, MyReviewQueryDto, UpsertReviewDto } from './dto/review.dto.js';

/** Public: reviews on a product page */
@Controller('public/products/:sellerSlug/:slug/reviews')
export class PublicReviewsController {
  constructor(private readonly reviews: ReviewsService) { }

  @Get()
  list(@Param('sellerSlug') sellerSlug: string, @Param('slug') slug: string, @Query() q: ListReviewsQueryDto) {
    return this.reviews.listForProduct(sellerSlug, slug, q);
  }
}

/** Signed-in shoppers: write, edit and delete their own review */
@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) { }

  @Get('mine')
  mine(@CurrentUser() user: JwtAccessPayload, @Query() q: MyReviewQueryDto) {
    return this.reviews.mine(user, q.productId);
  }

  @Put('products/:productId')
  upsert(@CurrentUser() user: JwtAccessPayload, @Param('productId') productId: string, @Body() dto: UpsertReviewDto) {
    return this.reviews.upsert(user, productId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.reviews.remove(user, id);
  }
}
