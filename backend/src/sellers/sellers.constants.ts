import { BusinessType, KycDocumentType } from '../generated/prisma/enums.js';

/** tenant-brand accent colors offered during onboarding */
export const BRAND_COLORS = ['#1B7A4F', '#2E77D0', '#D0455A', '#C98A2E', '#7B5CD6', '#0EA5A0'] as const;

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'SOLE_PROPRIETORSHIP', label: 'Sole proprietorship' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
  { value: 'LLP', label: 'LLP' },
  { value: 'PRIVATE_LIMITED', label: 'Private limited company' },
  { value: 'PUBLIC_LIMITED', label: 'Public limited company' },
  { value: 'HUF', label: 'HUF' },
  { value: 'OTHER', label: 'Other' },
];

export const KYC_DOCUMENTS: { type: KycDocumentType; label: string; fssaiOnly?: boolean }[] = [
  { type: 'AADHAAR', label: 'Aadhaar' },
  { type: 'PAN', label: 'PAN' },
  { type: 'BUSINESS_REGISTRATION_CERTIFICATE', label: 'Business registration certificate' },
  { type: 'FSSAI', label: 'FSSAI license', fssaiOnly: true },
];

/** FSSAI is required when any of the seller's categories needs it */
export function requiredKycDocuments(requiresFssai: boolean): KycDocumentType[] {
  return KYC_DOCUMENTS.filter((d) => !d.fssaiOnly || requiresFssai).map((d) => d.type);
}

/** Commission used when a category has no default set */
export const FALLBACK_COMMISSION_RATE = 10;

export const SELLER_ADMIN_ROLE_NAME = 'Seller Admin';

/** Validation patterns (India) */
export const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
