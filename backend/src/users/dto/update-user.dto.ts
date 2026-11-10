import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreateUserDto } from './create-user.dto.js';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  /** When sent (customer storefront), it must match before the password changes */
  @IsOptional()
  @IsString()
  currentPassword?: string;
}
