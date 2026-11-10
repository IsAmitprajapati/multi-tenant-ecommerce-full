import { PermissionLevel, UserType } from '../generated/prisma/enums.js';

/**
 * Every permission-controlled module, grouped by the panel it belongs to.
 *  - PLATFORM → Platform admin panel (roles with userType PLATFORM_ADMIN)
 *  - SELLER   → Seller admin panel (roles with userType SELLER)
 * Customers and delivery agents use their own apps and have no admin modules.
 *
 * Keep in sync with platform-admin/src/lib/permissions.ts
 */
export const PERMISSION_MODULES = [
  // Platform admin
  { key: 'DASHBOARD', scope: 'PLATFORM', label: 'Dashboard', description: 'Platform overview and KPIs' },
  { key: 'SELLERS', scope: 'PLATFORM', label: 'Sellers', description: 'Seller onboarding and KYC' },
  { key: 'COMMISSION_PAYOUTS', scope: 'PLATFORM', label: 'Commission & payouts', description: 'Commission rules, settlements and payouts' },
  { key: 'GLOBAL_CATALOG', scope: 'PLATFORM', label: 'Global catalog', description: 'Products, brands, attributes and tax' },
  { key: 'DELIVERY_NETWORK', scope: 'PLATFORM', label: 'Delivery network', description: 'Delivery agents, zones and KYC' },
  { key: 'CUSTOMERS', scope: 'PLATFORM', label: 'Customers', description: 'Customer accounts' },
  { key: 'ORDERS', scope: 'PLATFORM', label: 'Orders', description: 'Orders, cancellations and refunds' },
  { key: 'SUPPORT', scope: 'PLATFORM', label: 'Support', description: 'Support tickets' },
  { key: 'MARKETING', scope: 'PLATFORM', label: 'Marketing', description: 'Campaigns and promotions' },
  { key: 'REPORTS', scope: 'PLATFORM', label: 'Reports', description: 'Analytics and exports' },
  { key: 'USERS_PERMISSIONS', scope: 'PLATFORM', label: 'Users & permissions', description: 'Users, roles and access' },
  { key: 'SETTINGS', scope: 'PLATFORM', label: 'Settings', description: 'Platform configuration' },

  // Seller admin
  { key: 'SELLER_DASHBOARD', scope: 'SELLER', label: 'Dashboard', description: 'Seller overview' },
  { key: 'SELLER_PRODUCTS', scope: 'SELLER', label: 'Products', description: 'Products, variants and inventory' },
  { key: 'SELLER_COLLECTIONS', scope: 'SELLER', label: 'Collections & categories', description: 'Curated collections' },
  { key: 'SELLER_ORDERS', scope: 'SELLER', label: 'Orders', description: 'Seller orders and fulfilment' },
  { key: 'SELLER_RETURNS', scope: 'SELLER', label: 'Returns & replacements', description: 'Return and replacement requests' },
  { key: 'SELLER_CUSTOMERS', scope: 'SELLER', label: 'Customers', description: 'Seller customers and segments' },
  { key: 'SELLER_DISCOUNTS', scope: 'SELLER', label: 'Discounts', description: 'Coupons and offers' },
  { key: 'SELLER_DELIVERY', scope: 'SELLER', label: 'Delivery', description: 'Fees, slots and fleet' },
  { key: 'SELLER_REVIEWS', scope: 'SELLER', label: 'Reviews', description: 'Ratings and replies' },
  { key: 'SELLER_SETTINGS', scope: 'SELLER', label: 'Storefront settings', description: 'Seller page, payments, taxes and policies' },
  { key: 'SELLER_STAFF_ROLES', scope: 'SELLER', label: 'Staff & roles', description: 'Seller staff and their roles' },
  { key: 'SELLER_REPORTS', scope: 'SELLER', label: 'Reports', description: 'Seller analytics' },
] as const;

export type PermissionModule = (typeof PERMISSION_MODULES)[number]['key'];
export type PermissionScope = (typeof PERMISSION_MODULES)[number]['scope'];

export const PERMISSION_MODULE_KEYS = PERMISSION_MODULES.map((m) => m.key) as PermissionModule[];

/** Which module group a role of the given user type can be granted. */
export function scopeForUserType(userType: UserType): PermissionScope | null {
  if (userType === 'PLATFORM_ADMIN') return 'PLATFORM';
  if (userType === 'SELLER') return 'SELLER';
  return null; // CUSTOMER, DELIVERY_AGENT — no admin modules
}

export function moduleKeysForUserType(userType: UserType): PermissionModule[] {
  const scope = scopeForUserType(userType);
  return PERMISSION_MODULES.filter((m) => m.scope === scope).map((m) => m.key);
}

/** Levels are cumulative: MANAGE implies EDIT implies VIEW. */
export const PERMISSION_LEVEL_RANK: Record<PermissionLevel, number> = {
  NONE: 0,
  VIEW: 1,
  EDIT: 2,
  MANAGE: 3,
};

export const SUPER_ADMIN_ROLE_NAME = 'Platform Admin';

export function hasLevel(granted: PermissionLevel | undefined, required: PermissionLevel): boolean {
  return PERMISSION_LEVEL_RANK[granted ?? 'NONE'] >= PERMISSION_LEVEL_RANK[required];
}
