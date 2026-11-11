import { Module } from '@nestjs/common';
import { PublicReviewsController, ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  controllers: [PublicReviewsController, ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule { }
