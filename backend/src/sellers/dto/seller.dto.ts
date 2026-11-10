import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { BusinessType, KycDocumentType, KycStatus, SellerStatus } from '../../generated/prisma/enums.js';
import {
  BRAND_COLORS,
  GST_REGEX,
  PAN_REGEX,
  PHONE_REGEX,
  SELLER_CATEGORY_KEYS,
  SLUG_REGEX,
  type SellerCategoryKey,
} from '../sellers.constants.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class SellerBusinessDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(150)
  legalBusinessName: string;

  @IsEnum(BusinessType)
  businessType: BusinessType;

  @Transform(trim) @IsString() @MinLength(5) @MaxLength(300)
  registeredAddress: string;

  @Transform(emptyToUndefined) @Transform(upper) @IsOptional()
  @Matches(GST_REGEX, { message: 'GST number is not valid (e.g. 29ABCDE1234F1Z5)' })
  gstNumber?: string;

  @Transform(emptyToUndefined) @Transform(upper) @IsOptional()
  @Matches(PAN_REGEX, { message: 'PAN number is not valid (e.g. ABCDE1234F)' })
  panNumber?: string;

  @Transform(trim) @IsString() @MinLength(2) @MaxLength(100)
  ownerName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s-]/g, '') : value))
  @Matches(PHONE_REGEX, { message: 'Owner phone is not valid' })
  ownerPhone: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Owner email is not valid' })
  ownerEmail: string;
}

/** Public seller page & branding */
export class SellerProfileDto {
  @Transform(trim) @IsString() @MinLength(2) @MaxLength(80)
  name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString() @MinLength(3) @MaxLength(50)
  @Matches(SLUG_REGEX, { message: 'Page URL can only contain lowercase letters, numbers and hyphens' })
  slug: string;

  @IsIn(SELLER_CATEGORY_KEYS)
  category: SellerCategoryKey;

  @IsIn(BRAND_COLORS as unknown as string[], { message: 'Pick one of the brand colors' })
  brandColor: string;

  /** ImageKit fileId of the logo (uploaded directly from the browser) */
  @IsOptional() @IsString()
  logoFileId?: string;
}

export class SellerKycDocumentDto {
  @IsEnum(KycDocumentType)
  documentType: KycDocumentType;

  /** ImageKit fileId (uploaded directly from the browser as a private file) */
  @IsString()
  fileId: string;
}

export class SellerKycDto {
  @IsIn(['UPLOAD', 'OFFLINE'])
  mode: 'UPLOAD' | 'OFFLINE';

  @ValidateIf((o) => o.mode === 'UPLOAD')
  @IsArray()
  @ArrayUnique((d: SellerKycDocumentDto) => d.documentType, { message: 'Each document type can only be uploaded once' })
  @ValidateNested({ each: true })
  @Type(() => SellerKycDocumentDto)
  documents?: SellerKycDocumentDto[];

  @ValidateIf((o) => o.mode === 'OFFLINE')
  @Transform(trim) @IsString() @MinLength(3, { message: 'Reference number is required' }) @MaxLength(100)
  offlineReference?: string;
}

export class OnboardSellerDto {
  @ValidateNested() @Type(() => SellerBusinessDto)
  business: SellerBusinessDto;

  @ValidateNested() @Type(() => SellerProfileDto)
  profile: SellerProfileDto;

  @ValidateNested() @Type(() => SellerKycDto)
  kyc: SellerKycDto;
}

export class ListSellersQueryDto {
  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsEnum(SellerStatus)
  status?: SellerStatus;

  @IsOptional() @IsEnum(KycStatus)
  kycStatus?: KycStatus;
}

export class SlugQueryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString()
  slug: string;
}

export class UploadAuthQueryDto {
  @IsIn(['logo', 'kyc'])
  kind: 'logo' | 'kyc';
}

export class SellerStatusActionDto {
  @IsIn(['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE'])
  action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE';
}
