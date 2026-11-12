import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min,
  MinLength, NotEquals, ValidateNested,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { DeliveryScope, InventoryAdjustmentReason, PackageType, ProductStatus } from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MONEY = { maxDecimalPlaces: 2 };

export class ProductVariantDto {
  /** Existing variant id (omit for a new variant) */
  @IsOptional() @IsString()
  id?: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(80)
  name: string;

  @Type(() => Number) @IsNumber(MONEY) @Min(0.01, { message: 'Variant price must be more than 0' }) @Max(10_000_000)
  price: number;

  @IsOptional() @Transform(emptyToUndefined) @Type(() => Number) @IsNumber(MONEY) @Min(0)
  compareAtPrice?: number;

  @IsOptional() @Transform(emptyToUndefined) @Transform(trim) @IsString() @MaxLength(64)
  sku?: string;

  /** Initial stock — only for NEW variants; existing stock changes go through stock adjustments */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000)
  inventoryQty?: number;
}

export class ProductSpecDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(60)
  name: string;

  @Transform(trim) @IsString() @MinLength(1) @MaxLength(120)
  value: string;
}

export class ProductImageDto {
  /** ImageKit fileId (uploaded directly from the browser) */
  @IsString()
  fileId: string;
}

export class CreateProductDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(150)
  title: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(5000)
  description?: string;

  @IsString()
  categoryId: string;

  /** Seller's brand — created if it doesn't exist yet; empty = no brand */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80)
  brandName?: string;

  /** URL handle; generated from the title when omitted */
  @IsOptional() @Transform(emptyToUndefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString() @MinLength(2) @MaxLength(120) @Matches(SLUG_REGEX, { message: 'URL handle can only contain lowercase letters, numbers and hyphens' })
  slug?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(70)
  seoTitle?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(170)
  seoDescription?: string;

  @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus;

  @Type(() => Number) @IsNumber(MONEY) @Min(0.01, { message: 'Selling price must be more than 0' }) @Max(10_000_000)
  sellingPrice: number;

  @IsOptional() @Transform(emptyToUndefined) @Type(() => Number) @IsNumber(MONEY) @Min(0)
  compareAtPrice?: number;

  @IsOptional() @Transform(emptyToUndefined) @Type(() => Number) @IsNumber(MONEY) @Min(0)
  costPerItem?: number;

  @IsString()
  taxClassId: string;

  @IsOptional() @Transform(emptyToUndefined) @Transform(trim) @IsString() @MaxLength(64)
  sku?: string;

  /** Initial stock on create (products without variants). Later changes use stock adjustments. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1_000_000)
  inventoryQty?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100_000)
  lowStockThreshold?: number;

  @IsOptional() @Transform(emptyToUndefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) @Max(1000)
  weightKg?: number;

  @IsOptional() @IsEnum(PackageType)
  packageType?: PackageType;

  @IsOptional() @IsBoolean()
  requiresColdChain?: boolean;

  @IsOptional() @IsEnum(DeliveryScope)
  deliveryScope?: DeliveryScope;

  @IsOptional() @IsArray() @ArrayMaxSize(500)
  @Matches(/^[1-9]\d{5}$/, { each: true, message: 'Each pincode must be 6 digits' })
  deliveryPincodes?: string[];

  @IsOptional() @IsArray() @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => ProductVariantDto)
  variants?: ProductVariantDto[];

  /** Specifications (from Global catalog › Attributes), shown on the product page */
  @IsOptional() @IsArray() @ArrayMaxSize(30)
  @ValidateNested({ each: true }) @Type(() => ProductSpecDto)
  specs?: ProductSpecDto[];

  /** In display order — the first image is the primary one */
  @IsOptional() @IsArray() @ArrayMaxSize(10, { message: 'Up to 10 images per product' })
  @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[];
}

export class UpdateProductDto extends PartialType(CreateProductDto) { }

export class ProductStatusDto {
  @IsEnum(ProductStatus)
  status: ProductStatus;
}

export class StockAdjustmentDto {
  /** Required when the product has variants */
  @IsOptional() @IsString()
  variantId?: string;

  /** Signed change: +50 restock, -2 damaged */
  @Type(() => Number) @IsInt() @NotEquals(0, { message: 'Enter a non-zero change' }) @Min(-1_000_000) @Max(1_000_000)
  change: number;

  @IsIn(['RESTOCK', 'RETURNED', 'DAMAGED', 'MANUAL_ADJUSTMENT', 'OTHER'], { message: 'Choose a reason' })
  reason: InventoryAdjustmentReason;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(200)
  note?: string;
}

export class ListProductsQueryDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsIn(['IN', 'LOW', 'OUT'])
  stock?: 'IN' | 'LOW' | 'OUT';

  @IsOptional() @IsEnum(ProductStatus)
  status?: ProductStatus;
}

export class SlugCheckQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  slug: string;

  @IsOptional() @IsString()
  excludeId?: string;
}
