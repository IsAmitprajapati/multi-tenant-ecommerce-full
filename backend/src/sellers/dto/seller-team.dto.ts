import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import { UserStatus } from '../../generated/prisma/enums.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const phone = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value);
const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;

/** Add a staff member to the signed-in seller (they get an invite to set their password) */
export class CreateSellerStaffDto {
  @Transform(trim) @IsString() @MinLength(2)
  fullName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Enter a valid email' })
  email: string;

  @IsOptional() @Transform(phone) @Matches(PHONE_REGEX, { message: 'Enter a valid phone number' })
  phone?: string;

  @IsString()
  roleId: string;
}

export class UpdateSellerStaffDto {
  @IsOptional() @Transform(trim) @IsString() @MinLength(2)
  fullName?: string;

  @IsOptional() @Transform(phone) @Matches(PHONE_REGEX, { message: 'Enter a valid phone number' })
  phone?: string;

  @IsOptional() @IsString()
  roleId?: string;
}

export class SellerStaffStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}
