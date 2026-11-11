import Axios from "@/lib/axios";

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED'
export type CustomerStatusAction = 'DEACTIVATE' | 'REACTIVATE'

export interface ICustomer {
    id: string
    fullName: string
    email: string
    phone: string | null
    status: CustomerStatus
    profileImage: string | null
    createdAt: string
    lastActiveAt: string | null
    /** 0 / null until checkout exists */
    ordersCount: number
    lifetimeValue: number
    lastOrderAt: string | null
    counts: { cart: number; wishlist: number; reviews: number; addresses: number; activity: number; sessions: number }
}

export interface ICustomerAddress {
    id: string
    label: string
    fullName: string
    phone: string
    line1: string
    locality: string
    landmark: string | null
    city: string
    state: string
    pincode: string
    isDefault: boolean
}

export interface ICustomerDetail extends ICustomer {
    gender: 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | null
    dateOfBirth: string | null
    updatedAt: string
    activeSessions: number
    cartUnits: number
    addresses: ICustomerAddress[]
    recentReviews: {
        id: string
        rating: number
        title: string | null
        createdAt: string
        product: { title: string; slug: string; seller: { name: string; slug: string } }
    }[]
    orders: { id: string; number: string; storeName: string; createdAt: string; total: number }[]
}

export interface CustomerListMeta {
    page: number
    pageSize: number
    total: number
    statusCounts: Record<'ALL' | CustomerStatus, number>
    newThisMonth: number
}

export interface ListCustomersParams {
    search?: string
    status?: CustomerStatus
    from?: string
    to?: string
    page?: number
    pageSize?: number
}

export interface UpdateCustomerPayload {
    fullName?: string
    email?: string
    /** '' clears it */
    phone?: string
}

export interface PageMeta { page: number; pageSize: number; total: number }
export interface Paged<T> { data: T[]; meta: PageMeta }

export interface CustomerProductRef {
    id: string
    title: string
    slug: string
    imageUrl: string | null
    seller: { name: string; slug: string }
    /** Shoppers can see / buy it (product and seller active) */
    available: boolean
    hasVariants: boolean
}

export interface CustomerCartLine {
    id: string
    quantity: number
    savedForLater: boolean
    addedAt: string
    updatedAt: string
    product: CustomerProductRef
    variantName: string | null
    unitPrice: number
    mrp: number | null
    stock: number
    lineTotal: number
    state: 'OK' | 'OUT_OF_STOCK' | 'UNAVAILABLE'
}

export interface CustomerCart {
    items: CustomerCartLine[]
    savedForLater: CustomerCartLine[]
    summary: { lines: number; units: number; subtotal: number; savings: number; sellers: number }
}

export interface CustomerWishlistItem { id: string; addedAt: string; product: CustomerProductRef; price: number; mrp: number | null; inStock: boolean }
export interface CustomerReview { id: string; rating: number; title: string | null; body: string; status: 'PUBLISHED' | 'HIDDEN'; createdAt: string; updatedAt: string; product: CustomerProductRef }
export interface CustomerActivity { id: string; category: 'ORDERS' | 'OFFERS' | 'ACCOUNT'; title: string; body: string | null; readAt: string | null; createdAt: string }
export interface CustomerSession {
    id: string; device: string | null; os: string | null; browser: string | null; deviceLabel: string | null; ipAddress: string | null
    createdAt: string; lastActiveAt: string; expiresAt: string; revokedAt: string | null; state: 'ACTIVE' | 'EXPIRED' | 'SIGNED_OUT'
}
/** Filled in by checkout (not built yet) */
export interface CustomerOrder { id: string; number: string; storeName: string; createdAt: string; total: number; status: string; itemsCount: number }
export interface CustomerPayment { id: string; orderNumber: string; method: string; status: string; amount: number; createdAt: string; reference: string | null }

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const customerApi = {
    list: (params: ListCustomersParams, signal?: AbortSignal) =>
        Axios.get<ApiResponse<ICustomer[]> & { meta: CustomerListMeta }>('/customers', { params, signal }).then(r => r.data),
    get: (id: string) => Axios.get<ApiResponse<ICustomerDetail>>(`/customers/${id}`).then(r => r.data),
    update: (id: string, payload: UpdateCustomerPayload) =>
        Axios.patch<ApiResponse<ICustomerDetail>>(`/customers/${id}`, payload).then(r => r.data),
    cart: (id: string) => Axios.get<ApiResponse<CustomerCart>>(`/customers/${id}/cart`).then(r => r.data),
    wishlist: (id: string, page: number, pageSize = 12) => Axios.get<Paged<CustomerWishlistItem>>(`/customers/${id}/wishlist`, { params: { page, pageSize } }).then(r => r.data),
    orders: (id: string, page: number, pageSize = 10) => Axios.get<Paged<CustomerOrder>>(`/customers/${id}/orders`, { params: { page, pageSize } }).then(r => r.data),
    payments: (id: string, page: number, pageSize = 10) => Axios.get<Paged<CustomerPayment>>(`/customers/${id}/payments`, { params: { page, pageSize } }).then(r => r.data),
    reviews: (id: string, page: number, pageSize = 10) => Axios.get<Paged<CustomerReview>>(`/customers/${id}/reviews`, { params: { page, pageSize } }).then(r => r.data),
    activity: (id: string, page: number, pageSize = 15) => Axios.get<Paged<CustomerActivity>>(`/customers/${id}/activity`, { params: { page, pageSize } }).then(r => r.data),
    sessions: (id: string, page: number, pageSize = 10) => Axios.get<Paged<CustomerSession>>(`/customers/${id}/sessions`, { params: { page, pageSize } }).then(r => r.data),
    changeStatus: (id: string, action: CustomerStatusAction) =>
        Axios.patch<ApiResponse<ICustomerDetail>>(`/customers/${id}/status`, { action }).then(r => r.data),
}
