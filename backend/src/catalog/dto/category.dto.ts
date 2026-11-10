import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);

export class CreateCategoryDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  name: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(300)
  description?: string;

  /** Omit for a top-level category; set to create a sub-category under it */
  @IsOptional() @Transform(emptyToUndefined) @IsString()
  parentId?: string;

  /** Top-level only: default commission % for sellers in this category */
  @IsOptional() @Transform(emptyToUndefined) @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(50)
  defaultCommissionRate?: number;

  /** Top-level only: sellers in this category must upload an FSSAI license */
  @IsOptional() @IsBoolean()
  requiresFssai?: boolean;

  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000)
  sortOrder?: number;
}

/** A category's parent can't be changed after creation */
export class UpdateCategoryDto extends PartialType(OmitType(CreateCategoryDto, ['parentId'] as const)) { }

export class CategoryStatusDto {
  @IsBoolean()
  isActive: boolean;
}
