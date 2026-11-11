export interface ProductCard {
  id: string
  slug: string
  title: string
  imageUrl: string | null
  seller: { name: string; slug: string }
  brand: string | null
  /** Average stars, null until rated */
  rating: number | null
  ratingCount: number
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
  /** Small icon (home tiles, menus); falls back to a built-in icon */
  iconUrl: string | null
  /** Picture for category page cards */
  imageUrl: string | null
  productsCount: number
  children: { id: string; name: string; slug: string; iconUrl: string | null; imageUrl: string | null; productsCount: number }[]
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
  | { id: string; type: 'SHOP_BY_CATEGORY'; title: string; subtitle: string | null; categories: PublicCategory[]; viewAllHref: string | null }
  | { id: string; type: 'PROMO_CARDS'; title: string; subtitle: string | null; cards: PromoCard[]; viewAllHref: null }
  | { id: string; type: 'PRODUCTS'; title: string; subtitle: string | null; source: ProductSource; products: ProductCard[]; viewAllHref: string | null }

export interface HomeData {
  banners: { mode: 'CAROUSEL' | 'SINGLE'; autoplaySeconds: number; items: HomeBanner[] }
  sections: HomeSection[]
}

export interface ListingFacets {
  price: { min: number; max: number }
  sellers: { slug: string; name: string; count: number }[]
  brands: { name: string; count: number }[]
  /** False until customer reviews exist */
  ratingsAvailable: boolean
}

export interface ProductListing {
  category: { id: string; name: string; slug: string; description: string | null } | null
  sort: string
  products: ProductCard[]
  /** Category listings: total matches and filter options */
  total?: number
  facets?: ListingFacets
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
  rating: { average: number; count: number }
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

export interface Review {
  id: string
  rating: number
  title: string | null
  body: string
  createdAt: string
  edited: boolean
  /** "Priya S." */
  author: string
}

export interface ReviewPage {
  productId: string
  summary: { average: number; count: number; distribution: { stars: number; count: number }[] }
  items: Review[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface SellerStore {
  seller: {
    name: string
    slug: string
    logoUrl: string | null
    brandColor: string
    joinedAt: string
    categories: { name: string; slug: string }[]
  }
  stats: { products: number; rating: { average: number; count: number }; dealsCount: number }
  /** Sub-categories this store sells in (filter chips) */
  categories: { slug: string; name: string; parent: string | null; count: number }[]
  products: (ProductCard & { categorySlug: string; createdAt: string })[]
}
