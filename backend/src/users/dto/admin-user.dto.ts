import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { UserStatus, UserType } from '../../generated/prisma/enums.js';

const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/;
const STRONG_PASSWORD_MSG =
  'Password must be at least 8 characters and include upper & lower case letters, a number and a special character';

export class AdminCreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @Matches(STRONG_PASSWORD, { message: STRONG_PASSWORD_MSG })
  password: string;

  @IsString()
  roleId: string;
}

export class AdminUpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Optional on update — only changed when provided */
  @IsOptional()
  @ValidateIf((o) => o.password !== '')
  @Matches(STRONG_PASSWORD, { message: STRONG_PASSWORD_MSG })
  password?: string;

  @IsOptional()
  @IsString()
  roleId?: string;
}

export class AssignRoleDto {
  @IsString()
  roleId: string;
}

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status: UserStatus;
}

export class ListAdminUsersQueryDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserType)
  userType?: UserType;
}
