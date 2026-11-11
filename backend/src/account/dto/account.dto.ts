import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value);
const emptyToNull = ({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : trim({ value }));

export class AddressDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(20)
  label!: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Enter a valid 10-digit mobile number' })
  phone!: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  line1!: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(120)
  locality!: string;

  @IsOptional() @Transform(emptyToNull) @IsString() @MaxLength(120)
  landmark?: string | null;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60)
  city!: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(60)
  state!: string;

  @Transform(trim) @Matches(/^[1-9]\d{5}$/, { message: 'Enter a valid 6-digit pincode' })
  pincode!: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export const NOTIFICATION_FILTERS = ['all', 'orders', 'offers', 'account'] as const;

export class NotificationsQueryDto {
  @IsOptional() @IsIn(NOTIFICATION_FILTERS)
  category?: (typeof NOTIFICATION_FILTERS)[number];
}

class TopicsDto {
  @IsBoolean() orderUpdates!: boolean;
  @IsBoolean() promotions!: boolean;
  @IsBoolean() priceDrops!: boolean;
  @IsBoolean() newArrivals!: boolean;
}

class ChannelsDto {
  @IsBoolean() push!: boolean;
  @IsBoolean() email!: boolean;
  @IsBoolean() sms!: boolean;
}

export class NotificationPrefsDto {
  @ValidateNested() @Type(() => TopicsDto)
  topics!: TopicsDto;

  @ValidateNested() @Type(() => ChannelsDto)
  channels!: ChannelsDto;
}
