import Axios from '@/lib/axios'
import type { UploadAuth } from './seller'

export type BannerMode = 'CAROUSEL' | 'SINGLE'
export type SectionType = 'SHOP_BY_CATEGORY' | 'PRODUCTS' | 'PROMO_CARDS'
export type PromoTheme = 'DARK' | 'SAND' | 'MINT' | 'LIME' | 'ROSE' | 'SKY'
export interface PromoCard { tag: string | null; title: string; linkUrl: string | null; theme: PromoTheme }
export type ProductSource = 'DEALS' | 'LATEST' | 'TRENDING' | 'CATEGORY' | 'MANUAL'

export interface StorefrontSettings { bannerMode: BannerMode; autoplaySeconds: number }

export interface HomeBanner {
    id: string
    title: string
    subtitle: string | null
    ctaLabel: string | null
    linkUrl: string | null
    imageFileId: string
    imageUrl: string
    sortOrder: number
    isActive: boolean
    startsAt: string | null
    endsAt: string | null
}

export interface BannerPayload {
    title: string
    subtitle?: string | null
    ctaLabel?: string | null
    linkUrl?: string | null
    imageFileId: string
    isActive?: boolean
    startsAt?: string | null
    endsAt?: string | null
}

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
}

export interface HomeSection {
    id: string
    type: SectionType
    title: string
    subtitle: string | null
    source: ProductSource | null
    categoryId: string | null
    category: { id: string; name: string; parent: { name: string } | null } | null
    categoryIds: string[]
    cards: PromoCard[]
    productLimit: number
    sortOrder: number
    isActive: boolean
    pickedCount?: number
    products?: ProductCard[]
}

export interface SectionPayload {
    type?: SectionType
    title: string
    subtitle?: string | null
    source?: ProductSource
    categoryId?: string | null
    categoryIds?: string[]
    productIds?: string[]
    cards?: PromoCard[]
    productLimit?: number
    isActive?: boolean
}

export interface CategoryOption {
    id: string
    name: string
    isActive: boolean
    children: { id: string; name: string; isActive: boolean }[]
}

interface Saved<T> { success: boolean; message: string; data: T }

export const SOURCE_LABELS: Record<ProductSource, { label: string; hint: string }> = {
    DEALS: { label: 'Deals', hint: 'Biggest discounts first (MRP vs selling price)' },
    LATEST: { label: 'Latest', hint: 'Newest products first' },
    TRENDING: { label: 'Trending', hint: 'Most ordered recently — shows newest until orders come in' },
    CATEGORY: { label: 'Category', hint: 'Newest products from one category' },
    MANUAL: { label: 'Hand-picked', hint: 'Products you choose, in your order' },
}

/** Same colours as the storefront tiles */
export const PROMO_THEMES: Record<PromoTheme, { label: string; bg: string; tag: string; fg: string }> = {
    DARK: { label: 'Forest', bg: 'linear-gradient(120deg,#06251A,#10543A)', tag: '#9FE870', fg: '#FFFFFF' },
    SAND: { label: 'Sand', bg: 'linear-gradient(120deg,#F0E2C8,#E3CD9E)', tag: '#155C3B', fg: '#0C1F16' },
    MINT: { label: 'Mint', bg: 'linear-gradient(120deg,#D8EEDD,#B9DDC3)', tag: '#155C3B', fg: '#0C1F16' },
    LIME: { label: 'Lime', bg: 'linear-gradient(120deg,#9FE870,#7DD34F)', tag: '#0B3B29', fg: '#06251A' },
    ROSE: { label: 'Rose', bg: 'linear-gradient(120deg,#E8C9D3,#D8A8B8)', tag: '#7A2E4A', fg: '#0C1F16' },
    SKY: { label: 'Sky', bg: 'linear-gradient(120deg,#C9D8E8,#A8C0D8)', tag: '#1F4E7A', fg: '#0C1F16' },
}

export const storefrontApi = {
    settings: () => Axios.get<StorefrontSettings>('/storefront/settings').then(r => r.data),
    saveSettings: (p: Partial<StorefrontSettings>) => Axios.put<Saved<StorefrontSettings>>('/storefront/settings', p).then(r => r.data),
    uploadAuth: () => Axios.get<{ data: UploadAuth }>('/storefront/upload-auth').then(r => r.data.data),
    categoryOptions: () => Axios.get<CategoryOption[]>('/storefront/meta/categories').then(r => r.data),
    pickProducts: (q: string, categoryId?: string) =>
        Axios.get<ProductCard[]>('/storefront/meta/products', { params: { q: q || undefined, categoryId: categoryId || undefined } }).then(r => r.data),

    banners: () => Axios.get<HomeBanner[]>('/storefront/banners').then(r => r.data),
    createBanner: (p: BannerPayload) => Axios.post<Saved<HomeBanner>>('/storefront/banners', p).then(r => r.data),
    updateBanner: (id: string, p: Partial<BannerPayload>) => Axios.patch<Saved<HomeBanner>>(`/storefront/banners/${id}`, p).then(r => r.data),
    toggleBanner: (id: string, isActive: boolean) => Axios.patch<Saved<HomeBanner>>(`/storefront/banners/${id}/status`, { isActive }).then(r => r.data),
    deleteBanner: (id: string) => Axios.delete<{ message: string }>(`/storefront/banners/${id}`).then(r => r.data),
    reorderBanners: (ids: string[]) => Axios.put<{ message: string }>('/storefront/banners/order', { ids }).then(r => r.data),

    sections: () => Axios.get<HomeSection[]>('/storefront/sections').then(r => r.data),
    section: (id: string) => Axios.get<HomeSection>(`/storefront/sections/${id}`).then(r => r.data),
    createSection: (p: SectionPayload) => Axios.post<Saved<HomeSection>>('/storefront/sections', p).then(r => r.data),
    updateSection: (id: string, p: Partial<SectionPayload>) => Axios.patch<Saved<HomeSection>>(`/storefront/sections/${id}`, p).then(r => r.data),
    toggleSection: (id: string, isActive: boolean) => Axios.patch<Saved<HomeSection>>(`/storefront/sections/${id}/status`, { isActive }).then(r => r.data),
    deleteSection: (id: string) => Axios.delete<{ message: string }>(`/storefront/sections/${id}`).then(r => r.data),
    reorderSections: (ids: string[]) => Axios.put<{ message: string }>('/storefront/sections/order', { ids }).then(r => r.data),
}

export const CUSTOMER_STORE_URL = (import.meta.env.VITE_CUSTOMER_STORE_URL as string | undefined) ?? 'http://localhost:3000'
