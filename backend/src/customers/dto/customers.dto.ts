import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class ListCustomersQueryDto {
  @IsOptional() @IsString() @Transform(trim)
  search?: string;

  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
  status?: UserStatus;

  /** Registered on or after this day (YYYY-MM-DD) */
  @IsOptional() @IsDateString()
  from?: string;

  /** Registered on or before this day (YYYY-MM-DD, inclusive) */
  @IsOptional() @IsDateString()
  to?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100)
  pageSize?: number;
}

export class UpdateCustomerDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  fullName?: string;

  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value)) @IsEmail()
  email?: string;

  /** Empty string clears it */
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @ValidateIf((_, v) => v !== '' && v !== null)
  @Matches(/^\+?[1-9]\d{9,14}$/, { message: 'Enter a valid phone number' })
  phone?: string | null;
}

export class CustomerStatusDto {
  @IsIn(['DEACTIVATE', 'REACTIVATE'])
  action: 'DEACTIVATE' | 'REACTIVATE';
}

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(100)
  pageSize?: number;
}
