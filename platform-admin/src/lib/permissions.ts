/**
 * Module & permission-level catalogue.
 * Keep in sync with backend/src/permissions/permissions.constants.ts
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
  { key: 'SELLER_CUSTOMERS', scope: 'SELLER', label: 'Customers', description: 'Seller customers and segments (view only — sellers can’t edit customer details)', maxLevel: 'VIEW' },
  { key: 'SELLER_DISCOUNTS', scope: 'SELLER', label: 'Discounts', description: 'Coupons and offers' },
  { key: 'SELLER_DELIVERY', scope: 'SELLER', label: 'Delivery', description: 'Fees, slots and fleet' },
  { key: 'SELLER_REVIEWS', scope: 'SELLER', label: 'Reviews', description: 'Ratings and replies' },
  { key: 'SELLER_SETTINGS', scope: 'SELLER', label: 'Seller settings', description: 'Seller page, payments, taxes and policies' },
  { key: 'SELLER_STAFF_ROLES', scope: 'SELLER', label: 'Staff & roles', description: 'Seller staff and their roles' },
  { key: 'SELLER_REPORTS', scope: 'SELLER', label: 'Reports', description: 'Seller analytics' },
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]['key']
export type PermissionScope = (typeof PERMISSION_MODULES)[number]['scope']
export type UserType = 'PLATFORM_ADMIN' | 'SELLER' | 'CUSTOMER' | 'DELIVERY_AGENT'

export const USER_TYPES: { value: UserType; label: string; panel: string }[] = [
    { value: 'PLATFORM_ADMIN', label: 'Platform', panel: 'Platform admin panel' },
    { value: 'SELLER', label: 'Seller', panel: 'Seller admin panel' },
    { value: 'DELIVERY_AGENT', label: 'Delivery agent', panel: 'Delivery app' },
]

export const userTypeLabel = (t?: string) => USER_TYPES.find(u => u.value === t)?.label ?? t ?? '—'

export function modulesForUserType(userType: UserType) {
    const scope = userType === 'PLATFORM_ADMIN' ? 'PLATFORM' : userType === 'SELLER' ? 'SELLER' : null
    return PERMISSION_MODULES.filter(m => m.scope === scope)
}
export type PermissionLevel = 'NONE' | 'VIEW' | 'EDIT' | 'MANAGE'
export type PermissionMap = Partial<Record<PermissionModule, PermissionLevel>>

export const PERMISSION_LEVELS: { value: PermissionLevel; label: string; hint: string }[] = [
    { value: 'NONE', label: 'None', hint: 'No access' },
    { value: 'VIEW', label: 'View', hint: 'Read only' },
    { value: 'EDIT', label: 'Edit', hint: 'Create and update' },
    { value: 'MANAGE', label: 'Manage', hint: 'Full control incl. delete & configuration' },
]

const RANK: Record<PermissionLevel, number> = { NONE: 0, VIEW: 1, EDIT: 2, MANAGE: 3 }

export function hasLevel(granted: PermissionLevel | undefined, required: PermissionLevel) {
    return RANK[granted ?? 'NONE'] >= RANK[required]
}

export function emptyPermissionMap(level: PermissionLevel = 'NONE'): Record<PermissionModule, PermissionLevel> {
    return Object.fromEntries(PERMISSION_MODULES.map((m) => [m.key, level])) as Record<PermissionModule, PermissionLevel>
}

/** Highest level a module can be granted (e.g. sellers can only VIEW customers) */
export function maxLevelFor(module: string): PermissionLevel {
    const m = PERMISSION_MODULES.find(x => x.key === module) as { maxLevel?: PermissionLevel } | undefined
    return m?.maxLevel ?? 'MANAGE'
}

/** Lowers a level to the module's maximum */
export function capLevel(module: string, level: PermissionLevel): PermissionLevel {
    return RANK[level] > RANK[maxLevelFor(module)] ? maxLevelFor(module) : level
}
