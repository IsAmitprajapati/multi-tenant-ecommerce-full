export interface ProductCard {
  id: string
  slug: string
  title: string
  imageUrl: string | null
  seller: { name: string; slug: string }
  price: number
  mrp: number | null
  discountPercent: number
  inStock: boolean
  hasVariants: boolean
}

export interface PublicCategory {
  id: string
  name: string
  slug: string
  description: string | null
  productsCount: number
  children: { id: string; name: string; slug: string }[]
}

export interface HomeBanner {
  id: string
  title: string
  subtitle: string | null
  ctaLabel: string | null
  linkUrl: string | null
  imageUrl: string
}

export type PromoTheme = 'DARK' | 'SAND' | 'MINT' | 'LIME' | 'ROSE' | 'SKY'
export interface PromoCard { tag: string | null; title: string; linkUrl: string | null; theme: PromoTheme }

export type ProductSource = 'DEALS' | 'LATEST' | 'TRENDING' | 'CATEGORY' | 'MANUAL'

export type HomeSection =
  | { id: string; type: 'SHOP_BY_CATEGORY'; title: string; subtitle: string | null; categories: PublicCategory[]; viewAllHref: null }
  | { id: string; type: 'PROMO_CARDS'; title: string; subtitle: string | null; cards: PromoCard[]; viewAllHref: null }
  | { id: string; type: 'PRODUCTS'; title: string; subtitle: string | null; source: ProductSource; products: ProductCard[]; viewAllHref: string | null }

export interface HomeData {
  banners: { mode: 'CAROUSEL' | 'SINGLE'; autoplaySeconds: number; items: HomeBanner[] }
  sections: HomeSection[]
}

export interface ProductListing {
  category: { id: string; name: string; slug: string; description: string | null } | null
  sort: string
  products: ProductCard[]
}

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  phone: string | null
  userType: 'CUSTOMER' | 'SELLER' | 'PLATFORM_ADMIN' | 'DELIVERY_AGENT'
  profileImage: string | null
  createdAt: string
  passwordUpdatedAt: string
}

export interface UserSessionRow {
  id: string
  deviceLabel: string | null
  ipAddress: string | null
  createdAt: string
  lastActiveAt: string
  expiresAt: string
  isCurrent: boolean
}

export interface ProductVariantOption {
  id: string
  name: string
  price: number
  mrp: number | null
  inStock: boolean
  /** Most a shopper can add (stock, capped at 10) */
  maxQty: number
  lowStock: boolean
}

export interface ProductDetail {
  id: string
  slug: string
  title: string
  description: string | null
  seo: { title: string | null; description: string | null }
  brand: string | null
  seller: { name: string; slug: string; logoUrl: string | null; brandColor: string; categories: string[] }
  category: { name: string; slug: string }
  parentCategory: { name: string; slug: string } | null
  images: { id: string; url: string }[]
  price: number
  mrp: number | null
  inStock: boolean
  maxQty: number
  lowStock: boolean
  variants: ProductVariantOption[]
  specs: { sku: string | null; weightKg: number | null; packageType: string; requiresColdChain: boolean }
  delivery: { scope: 'SELLER_PINCODE_ONLY' | 'SPECIFIC_PINCODES' | 'PAN_INDIA'; pincodes: string[] }
  related: ProductCard[]
}
