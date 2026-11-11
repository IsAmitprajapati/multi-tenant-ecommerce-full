import Axios from "@/lib/axios";

/**
 * Seller admin › Customers — read-only, only shoppers who have ordered from this seller, and only:
 * name, number of orders with this seller, total order value, and those orders' details.
 * Order figures stay 0 until checkout exists.
 */
export interface SellerCustomer {
    id: string
    fullName: string
    /** With this seller only */
    ordersCount: number
    totalOrderValue: number
}

export interface PageMeta { page: number; pageSize: number; total: number }
export interface Paged<T> { data: T[]; meta: PageMeta }

/** One order with this seller (filled by checkout) */
export interface SellerCustomerOrder {
    id: string
    number: string
    createdAt: string
    status: string
    paymentStatus: string
    paymentMethod: string | null
    total: number
    items: { productTitle: string; variantName: string | null; quantity: number; unitPrice: number; imageUrl: string | null }[]
}

export const sellerCustomersApi = {
    list: (params: { search?: string; page?: number; pageSize?: number }, signal?: AbortSignal) =>
        Axios.get<Paged<SellerCustomer>>('/seller-portal/customers', { params, signal }).then(r => r.data),
    get: (id: string) => Axios.get<{ data: SellerCustomer }>(`/seller-portal/customers/${id}`).then(r => r.data),
    orders: (id: string, page: number, pageSize = 10) =>
        Axios.get<Paged<SellerCustomerOrder>>(`/seller-portal/customers/${id}/orders`, { params: { page, pageSize } }).then(r => r.data),
}
