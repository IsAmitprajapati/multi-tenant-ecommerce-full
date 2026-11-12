import Axios from "@/lib/axios";

export type ProductStatus = 'ACTIVE' | 'INACTIVE'
export type StockStatus = 'IN' | 'LOW' | 'OUT'
export type PackageType = 'STANDARD_BAG' | 'BOX' | 'ENVELOPE' | 'FRAGILE' | 'CUSTOM'
export type DeliveryScope = 'SELLER_PINCODE_ONLY' | 'SPECIFIC_PINCODES' | 'PAN_INDIA'
export type AdjustmentReason = 'INITIAL_STOCK' | 'RESTOCK' | 'SOLD_VIA_ORDER' | 'RETURNED' | 'DAMAGED' | 'MANUAL_ADJUSTMENT' | 'OTHER'

export interface CatalogMeta {
    categories: { id: string; name: string; sellerCategory: string | null; requiresFssai: boolean; children: { id: string; name: string }[] }[]
    taxClasses: { id: string; hsnCode: string; description: string; gstRatePercent: number }[]
    brands: { id: string; name: string }[]
    /** Global catalog › Attributes for the seller's categories (categoryId null = every category) */
    attributes: CatalogAttribute[]
    packageTypes: { value: PackageType; label: string }[]
    deliveryScopes: { value: DeliveryScope; label: string; description: string }[]
    adjustmentReasons: { value: AdjustmentReason; label: string; manual: boolean }[]
}

export interface CatalogAttribute { id: string; name: string; values: string[]; categoryId: string | null }
export interface ProductSpec { name: string; value: string }

export interface ProductListItem {
    id: string
    title: string
    slug: string
    sku: string | null
    status: ProductStatus
    imageUrl: string | null
    category: { id: string; name: string; parentName: string | null }
    price: number
    priceMax: number
    compareAtPrice: number | null
    variantCount: number
    stock: number
    stockStatus: StockStatus
    lowStockThreshold: number
    updatedAt: string
    /** false once the product is in any order — then it can only be deactivated */
    canDelete: boolean
    deleteBlockedReason: string | null
}

export interface ProductVariant {
    id: string
    name: string
    price: number
    compareAtPrice: number | null
    inventoryQty: number
    sku: string | null
    sortOrder: number
}

export interface ProductDetail {
    id: string
    title: string
    description: string | null
    slug: string
    seoTitle: string | null
    seoDescription: string | null
    status: ProductStatus
    sellingPrice: number
    compareAtPrice: number | null
    costPerItem: number | null
    sku: string | null
    inventoryQty: number
    lowStockThreshold: number
    weightKg: number | null
    packageType: PackageType
    requiresColdChain: boolean
    deliveryScope: DeliveryScope
    deliveryPincodes: string[]
    category: { id: string; name: string; parent: { id: string; name: string } | null }
    brand: { id: string; name: string } | null
    specs: ProductSpec[]
    taxClass: { id: string; hsnCode: string; description: string; gstRatePercent: number }
    variants: ProductVariant[]
    images: { id: string; fileId: string; url: string; isPrimary: boolean; sortOrder: number }[]
    adjustments: {
        id: string
        changeQty: number
        resultingQty: number
        reason: AdjustmentReason
        note: string | null
        createdAt: string
        variant: { id: string; name: string } | null
        adjustedBy: { id: string; fullName: string } | null
    }[]
    stock: number
    stockStatus: StockStatus
    margin: { perUnit: number; percent: number } | null
    canDelete: boolean
    deleteBlockedReason: string | null
    createdAt: string
    updatedAt: string
}

export interface ProductPayload {
    title: string
    description?: string
    categoryId: string
    brandName?: string
    specs?: ProductSpec[]
    slug?: string
    seoTitle?: string
    seoDescription?: string
    status?: ProductStatus
    sellingPrice: number
    compareAtPrice?: number | null
    costPerItem?: number | null
    taxClassId: string
    sku?: string
    inventoryQty?: number
    lowStockThreshold?: number
    weightKg?: number | null
    packageType?: PackageType
    requiresColdChain?: boolean
    deliveryScope?: DeliveryScope
    deliveryPincodes?: string[]
    variants?: { id?: string; name: string; price: number; compareAtPrice?: number; sku?: string; inventoryQty?: number }[]
    images?: { fileId: string }[]
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

/** Catalog options cached for the session (cleared on failure; new brands refresh it) */
let metaCache: Promise<ApiResponse<CatalogMeta>> | null = null

export const productsApi = {
    meta: (fresh = false) => {
        if (fresh || !metaCache) {
            metaCache = Axios.get<ApiResponse<CatalogMeta>>('/seller-portal/catalog-meta').then(r => r.data)
            metaCache.catch(() => { metaCache = null }) // retry next time after a failure
        }
        return metaCache
    },
    list: (params: { search?: string; categoryId?: string; stock?: StockStatus; status?: ProductStatus } = {}) =>
        Axios.get<ApiResponse<ProductListItem[]>>('/seller-portal/products', { params }).then(r => r.data),
    get: (id: string) => Axios.get<ApiResponse<ProductDetail>>(`/seller-portal/products/${id}`).then(r => r.data),
    slugAvailability: (slug: string, excludeId?: string) =>
        Axios.get<ApiResponse<{ slug: string; available: boolean; reason: string | null }>>('/seller-portal/products/slug-availability', { params: { slug, excludeId } }).then(r => r.data),
    create: (payload: ProductPayload) => Axios.post<ApiResponse<ProductDetail>>('/seller-portal/products', payload).then(r => r.data),
    update: (id: string, payload: Partial<ProductPayload>) => Axios.patch<ApiResponse<ProductDetail>>(`/seller-portal/products/${id}`, payload).then(r => r.data),
    setStatus: (id: string, status: ProductStatus) => Axios.patch<ApiResponse<ProductDetail>>(`/seller-portal/products/${id}/status`, { status }).then(r => r.data),
    adjustStock: (id: string, payload: { variantId?: string; change: number; reason: AdjustmentReason; note?: string }) =>
        Axios.post<ApiResponse<ProductDetail>>(`/seller-portal/products/${id}/stock-adjustments`, payload).then(r => r.data),
    remove: (id: string) => Axios.delete<{ success: boolean; message: string }>(`/seller-portal/products/${id}`).then(r => r.data),
}
