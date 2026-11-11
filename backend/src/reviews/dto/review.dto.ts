import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+\n/g, '\n') : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : typeof value === 'string' ? value.trim() : value);

export class UpsertReviewDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating!: number;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(80)
  title?: string | null;

  @Transform(trim) @IsString() @MinLength(10, { message: 'Write at least 10 characters about the product' }) @MaxLength(2000)
  body!: string;
}

export const REVIEW_SORTS = ['recent', 'highest', 'lowest'] as const;

export class ListReviewsQueryDto {
  @IsOptional() @IsIn(REVIEW_SORTS)
  sort?: (typeof REVIEW_SORTS)[number];

  /** Only reviews with exactly this many stars */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500)
  page?: number;

  /** Product page shows 5; the all-reviews page uses the default 10 */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20)
  pageSize?: number;
}

export class MyReviewQueryDto {
  @IsString() @MinLength(1)
  productId!: string;
}
