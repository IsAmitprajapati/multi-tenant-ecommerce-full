import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class PagedSearchQueryDto {
  @IsOptional() @IsString() @Transform(trim)
  search?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100)
  pageSize?: number;
}

// ───────────── Attributes ─────────────

export class AttributeDto {
  @Transform(trim) @IsString() @MinLength(1) @MaxLength(40)
  name: string;

  /** e.g. ["XS","S","M"] — trimmed, de-duplicated */
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? [...new Set(value.map((v) => String(v).trim()).filter(Boolean))] : value))
  values: string[];

  /** Top-level category; null = all categories */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  categoryId?: string | null;
}

export class UpdateAttributeDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(1) @MaxLength(40)
  name?: string;

  @IsOptional() @IsArray() @ArrayMaxSize(100) @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? [...new Set(value.map((v) => String(v).trim()).filter(Boolean))] : value))
  values?: string[];

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  categoryId?: string | null;
}

export class ActiveDto {
  @IsBoolean()
  isActive: boolean;
}

// ───────────── Tax classes ─────────────

export class TaxClassDto {
  /** 4, 6 or 8 digit HSN / SAC code */
  @Transform(trim) @Matches(/^\d{4}(\d{2}){0,2}$/, { message: 'HSN code must be 4, 6 or 8 digits' })
  hsnCode: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  description: string;

  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsIn([0, 0.25, 3, 5, 12, 18, 28], { message: 'GST rate must be one of 0, 0.25, 3, 5, 12, 18 or 28 %' })
  gstRatePercent: number;
}

export class UpdateTaxClassDto {
  @IsOptional() @Transform(trim) @Matches(/^\d{4}(\d{2}){0,2}$/, { message: 'HSN code must be 4, 6 or 8 digits' })
  hsnCode?: string;

  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  description?: string;

  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @IsIn([0, 0.25, 3, 5, 12, 18, 28], { message: 'GST rate must be one of 0, 0.25, 3, 5, 12, 18 or 28 %' })
  gstRatePercent?: number;
}

// ───────────── Brands ─────────────

export class ListBrandsQueryDto extends PagedSearchQueryDto {
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}

// ───────────── Products (cross-store) ─────────────

export const PRODUCT_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE', 'FLAGGED', 'BLOCKED', 'OUT_OF_STOCK'] as const;
export type ProductFilter = (typeof PRODUCT_FILTERS)[number];

export class ListPlatformProductsQueryDto extends PagedSearchQueryDto {
  @IsOptional() @IsString()
  sellerId?: string;

  /** Top-level category */
  @IsOptional() @IsString()
  categoryId?: string;

  @IsOptional() @IsIn(PRODUCT_FILTERS)
  filter?: ProductFilter;
}

export class FlagProductDto {
  @IsBoolean()
  flagged: boolean;

  /** Shown to the seller — required when flagging */
  @ValidateIf((o: FlagProductDto) => o.flagged) @Transform(trim) @IsString() @MinLength(5) @MaxLength(300)
  reason?: string;
}

export class BlockProductDto {
  @IsBoolean()
  blocked: boolean;

  @ValidateIf((o: BlockProductDto) => o.blocked) @Transform(trim) @IsString() @MinLength(5) @MaxLength(300)
  reason?: string;
}
