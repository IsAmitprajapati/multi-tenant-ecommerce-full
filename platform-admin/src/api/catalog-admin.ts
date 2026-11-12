import Axios from "@/lib/axios";

/** Platform admin › Global catalog — attributes, brands, HSN / tax classes, products across every store */

interface ApiResponse<T> { success?: boolean; message?: string; data: T }
export interface PageMeta { page: number; pageSize: number; total: number }

export interface CatalogAttribute {
    id: string
    name: string
    values: string[]
    isActive: boolean
    createdAt: string
    updatedAt: string
    /** null = all categories */
    category: { id: string; name: string } | null
}
export interface AttributePayload { name: string; values: string[]; categoryId: string | null }

export interface TaxClass {
    id: string
    hsnCode: string
    description: string
    gstRatePercent: number
    isActive: boolean
    productsCount: number
}
export interface TaxClassPayload { hsnCode: string; description: string; gstRatePercent: number }
export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const

export interface CatalogBrand {
    id: string
    name: string
    isActive: boolean
    createdAt: string
    seller: { id: string; name: string; slug: string }
    productsCount: number
}

export type ProductFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'FLAGGED' | 'BLOCKED' | 'OUT_OF_STOCK'

export interface Moderation {
    flagged: boolean
    flagReason: string | null
    flaggedAt: string | null
    blocked: boolean
    blockReason: string | null
    blockedAt: string | null
}

export interface PlatformProduct {
    id: string
    title: string
    slug: string
    sku: string | null
    status: 'ACTIVE' | 'INACTIVE'
    createdAt: string
    imageUrl: string | null
    seller: { id: string; name: string; slug: string }
    /** "Parent › Sub" */
    category: string
    price: number
    priceMax: number
    variantCount: number
    stock: number
    rating: { avg: number; count: number }
    moderation: Moderation
}

export interface PlatformProductDetail {
    id: string
    title: string
    slug: string
    description: string | null
    sku: string | null
    status: 'ACTIVE' | 'INACTIVE'
    createdAt: string
    updatedAt: string
    firstOrderedAt: string | null
    seller: { id: string; name: string; slug: string; status: string; logoUrl: string | null; brandColor: string }
    category: { id: string; name: string; parent: { id: string; name: string } | null }
    brand: { id: string; name: string; isActive: boolean } | null
    tax: { hsnCode: string; description: string; gstRatePercent: number }
    price: number
    compareAtPrice: number | null
    stock: number
    lowStockThreshold: number
    images: { id: string; url: string }[]
    variants: { id: string; name: string; sku: string | null; price: number; compareAtPrice: number | null; inventoryQty: number }[]
    delivery: { packageType: string; weightKg: number | null; requiresColdChain: boolean; scope: string; pincodes: string[] }
    rating: { avg: number; count: number }
    counts: { reviews: number; inCarts: number; inWishlists: number }
    moderation: Moderation
}

export const catalogAdminApi = {
    attributes: () => Axios.get<ApiResponse<CatalogAttribute[]>>('/catalog/attributes').then(r => r.data),
    createAttribute: (p: AttributePayload) => Axios.post<ApiResponse<CatalogAttribute[]>>('/catalog/attributes', p).then(r => r.data),
    updateAttribute: (id: string, p: Partial<AttributePayload>) => Axios.patch<ApiResponse<CatalogAttribute[]>>(`/catalog/attributes/${id}`, p).then(r => r.data),
    attributeStatus: (id: string, isActive: boolean) => Axios.patch<ApiResponse<CatalogAttribute[]>>(`/catalog/attributes/${id}/status`, { isActive }).then(r => r.data),

    taxClasses: () => Axios.get<ApiResponse<TaxClass[]>>('/catalog/tax-classes').then(r => r.data),
    createTaxClass: (p: TaxClassPayload) => Axios.post<ApiResponse<TaxClass[]>>('/catalog/tax-classes', p).then(r => r.data),
    updateTaxClass: (id: string, p: Partial<TaxClassPayload>) => Axios.patch<ApiResponse<TaxClass[]>>(`/catalog/tax-classes/${id}`, p).then(r => r.data),
    taxClassStatus: (id: string, isActive: boolean) => Axios.patch<ApiResponse<TaxClass[]>>(`/catalog/tax-classes/${id}/status`, { isActive }).then(r => r.data),

    brands: (params: { search?: string; status?: 'ACTIVE' | 'INACTIVE'; page?: number; pageSize?: number }, signal?: AbortSignal) =>
        Axios.get<{ data: CatalogBrand[]; meta: PageMeta & { counts: Record<'ALL' | 'ACTIVE' | 'INACTIVE', number> } }>('/catalog/brands', { params, signal }).then(r => r.data),
    brandStatus: (id: string, isActive: boolean) => Axios.patch<{ message: string }>(`/catalog/brands/${id}/status`, { isActive }).then(r => r.data),

    productsMeta: () => Axios.get<ApiResponse<{ sellers: { id: string; name: string }[]; categories: { id: string; name: string }[] }>>('/catalog/products/meta').then(r => r.data),
    products: (params: { search?: string; sellerId?: string; categoryId?: string; filter?: ProductFilter; page?: number; pageSize?: number }, signal?: AbortSignal) =>
        Axios.get<{ data: PlatformProduct[]; meta: PageMeta & { counts: Record<ProductFilter, number> } }>('/catalog/products', { params, signal }).then(r => r.data),
    product: (id: string) => Axios.get<ApiResponse<PlatformProductDetail>>(`/catalog/products/${id}`).then(r => r.data),
    flag: (id: string, flagged: boolean, reason?: string) => Axios.patch<ApiResponse<PlatformProductDetail>>(`/catalog/products/${id}/flag`, { flagged, reason }).then(r => r.data),
    block: (id: string, blocked: boolean, reason?: string) => Axios.patch<ApiResponse<PlatformProductDetail>>(`/catalog/products/${id}/block`, { blocked, reason }).then(r => r.data),
}
