import { BusinessType, KycDocumentType } from '../generated/prisma/enums.js';

/**
 * Seller categories. `commissionRate` is the default applied on approval
 * (adjustable later in Commission & payouts). FSSAI is required for food.
 * Keep in sync with platform-admin/src/lib/sellers.ts
 */
export const SELLER_CATEGORIES = [
  { key: 'grocery', label: 'Grocery & food', commissionRate: 8, requiresFssai: true },
  { key: 'fashion', label: 'Fashion & apparel', commissionRate: 12, requiresFssai: false },
  { key: 'electronics', label: 'Electronics', commissionRate: 6, requiresFssai: false },
  { key: 'home', label: 'Home & kitchen', commissionRate: 10, requiresFssai: false },
  { key: 'beauty', label: 'Beauty & personal care', commissionRate: 10, requiresFssai: false },
  { key: 'other', label: 'Other', commissionRate: 10, requiresFssai: false },
] as const;

export type SellerCategoryKey = (typeof SELLER_CATEGORIES)[number]['key'];
export const SELLER_CATEGORY_KEYS = SELLER_CATEGORIES.map((c) => c.key) as SellerCategoryKey[];

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

export function requiredKycDocuments(category: SellerCategoryKey): KycDocumentType[] {
  const needsFssai = SELLER_CATEGORIES.find((c) => c.key === category)?.requiresFssai ?? false;
  return KYC_DOCUMENTS.filter((d) => !d.fssaiOnly || needsFssai).map((d) => d.type);
}

export const SELLER_ADMIN_ROLE_NAME = 'Seller Admin';

/** Validation patterns (India) */
export const GST_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const PAN_REGEX = /^[A-Z]{5}\d{4}[A-Z]$/;
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PHONE_REGEX = /^\+?[1-9]\d{9,14}$/;
