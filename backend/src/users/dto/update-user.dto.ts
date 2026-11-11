import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  /** When sent (customer storefront), it must match before the password changes */
  @IsOptional()
  @IsString()
  currentPassword?: string;

  /** Shopper profile (storefront); null clears it */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsIn(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'])
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null;

  /** YYYY-MM-DD; null clears it */
  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString({ strict: true })
  dateOfBirth?: string | null;
}
