import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDate, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToNull = ({ value }: { value: unknown }) => (value === '' ? null : typeof value === 'string' ? value.trim() : value);

/** Relative paths (/category/grocery) or http(s) URLs only — never javascript: etc. */
const LINK_RE = /^(\/[^\s]*|https?:\/\/[^\s]+)$/;

export const BANNER_MODES = ['CAROUSEL', 'SINGLE'] as const;
export const SECTION_TYPES = ['SHOP_BY_CATEGORY', 'PRODUCTS', 'PROMO_CARDS'] as const;
export const CARD_THEMES = ['DARK', 'SAND', 'MINT', 'LIME', 'ROSE', 'SKY'] as const;
export const PRODUCT_SOURCES = ['DEALS', 'LATEST', 'TRENDING', 'CATEGORY', 'MANUAL'] as const;

export class StorefrontSettingsDto {
  @IsOptional() @IsIn(BANNER_MODES)
  bannerMode?: (typeof BANNER_MODES)[number];

  @IsOptional() @Type(() => Number) @IsInt() @Min(2) @Max(30)
  autoplaySeconds?: number;
}

export class CreateBannerDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100)
  title!: string;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(200)
  subtitle?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(30)
  ctaLabel?: string | null;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(500) @Matches(LINK_RE, { message: 'Link must start with / or http(s)://' })
  linkUrl?: string | null;

  /** ImageKit fileId uploaded from the browser (verified server-side) */
  @IsString() @MinLength(1)
  imageFileId!: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Transform(emptyToNull) @Type(() => Date) @IsDate()
  startsAt?: Date | null;

  @IsOptional() @Transform(emptyToNull) @Type(() => Date) @IsDate()
  endsAt?: Date | null;
}

export class UpdateBannerDto extends PartialType(CreateBannerDto) { }

export class PromoCardDto {
  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(20)
  tag?: string | null;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60)
  title!: string;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(500) @Matches(LINK_RE, { message: 'Card link must start with / or http(s)://' })
  linkUrl?: string | null;

  @IsIn(CARD_THEMES)
  theme!: (typeof CARD_THEMES)[number];
}

export class CreateSectionDto {
  @IsIn(SECTION_TYPES)
  type!: (typeof SECTION_TYPES)[number];

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  title!: string;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(160)
  subtitle?: string | null;

  @IsOptional() @IsIn(PRODUCT_SOURCES)
  source?: (typeof PRODUCT_SOURCES)[number];

  @IsOptional() @Transform(emptyToNull) @IsString()
  categoryId?: string | null;

  /** SHOP_BY_CATEGORY: chosen top-level categories (empty = all) */
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true })
  categoryIds?: string[];

  /** MANUAL: hand-picked product ids in order */
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsString({ each: true })
  productIds?: string[];

  @IsOptional() @Type(() => Number) @IsInt() @Min(2) @Max(40)
  productLimit?: number;

  /** PROMO_CARDS: 1–6 tiles in order */
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(6) @ValidateNested({ each: true }) @Type(() => PromoCardDto)
  cards?: PromoCardDto[];

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class UpdateSectionDto extends PartialType(CreateSectionDto) { }

export class ReorderDto {
  @IsArray() @ArrayMaxSize(200) @IsString({ each: true })
  ids!: string[];
}

export class ToggleDto {
  @IsBoolean()
  isActive!: boolean;
}

export class ProductPickerQueryDto {
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @IsString()
  categoryId?: string;
}

/** Comma-separated or repeated query params → string[] */
const toList = ({ value }: { value: unknown }) =>
  (Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [])
    .map((v) => String(v).trim()).filter(Boolean).slice(0, 30);

/** GET /public/products — search, category listing and filters */
export class ProductListQueryDto {
  @IsOptional() @IsString() @MaxLength(120)
  category?: string;

  @IsOptional() @IsString() @MaxLength(20)
  sort?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(100)
  q?: string;

  @IsOptional() @Type(() => Number) @Min(0)
  minPrice?: number;

  @IsOptional() @Type(() => Number) @Min(0)
  maxPrice?: number;

  /** Seller slugs */
  @IsOptional() @Transform(toList) @IsArray() @IsString({ each: true })
  seller?: string[];

  /** Brand names */
  @IsOptional() @Transform(toList) @IsArray() @IsString({ each: true })
  brand?: string[];

  /** Minimum discount % */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(95)
  discount?: number;

  /** Minimum average stars (1–4 "& up") */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(5)
  rating?: number;

  @IsOptional() @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  inStock?: boolean;
}
