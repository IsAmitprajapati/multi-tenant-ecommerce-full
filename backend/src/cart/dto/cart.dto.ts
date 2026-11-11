import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min, MinLength, ValidateIf, ValidateNested } from 'class-validator';

export const MAX_LINE_QTY = 10;
export const MAX_CART_LINES = 50;

export class AddToCartDto {
  @IsString() @MinLength(1)
  productId!: string;

  /** Required when the product has options */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  variantId?: string | null;

  @Type(() => Number) @IsInt() @Min(1) @Max(MAX_LINE_QTY)
  quantity!: number;
}

export class UpdateCartItemDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(MAX_LINE_QTY)
  quantity?: number;

  @IsOptional() @IsBoolean()
  savedForLater?: boolean;
}

/** A guest cart line (kept in the browser) */
export class GuestCartLineDto extends AddToCartDto {
  @IsOptional() @IsBoolean()
  savedForLater?: boolean;
}

export class GuestCartDto {
  @IsArray() @ArrayMaxSize(MAX_CART_LINES) @ValidateNested({ each: true }) @Type(() => GuestCartLineDto)
  items!: GuestCartLineDto[];
}
