import Axios from "@/lib/axios";
import type { UploadAuth } from "./seller";

export interface SubCategory {
    imageUrl: string | null
    imageFileId: string | null
    iconUrl: string | null
    iconFileId: string | null
    id: string
    name: string
    slug: string
    description: string | null
    parentId: string
    requiresFssai: boolean
    isActive: boolean
    sortOrder: number
    productsCount: number
}

export interface Category {
    imageUrl: string | null
    imageFileId: string | null
    iconUrl: string | null
    iconFileId: string | null
    id: string
    name: string
    slug: string
    description: string | null
    parentId: null
    /** Default commission % for sellers in this category */
    defaultCommissionRate: number | null
    requiresFssai: boolean
    isActive: boolean
    sortOrder: number
    sellersCount: number
    /** Products across all its sub-categories */
    productsCount: number
    children: SubCategory[]
}

export interface CategoryDetail {
    imageUrl: string | null
    imageFileId: string | null
    iconUrl: string | null
    iconFileId: string | null
    id: string
    name: string
    slug: string
    description: string | null
    parentId: string | null
    parent: { id: string; name: string } | null
    defaultCommissionRate: number | null
    requiresFssai: boolean
    isActive: boolean
    sortOrder: number
    sellersCount: number
    productsCount: number
    childrenCount: number
}

export interface CategoryPayload {
    name: string
    description?: string
    parentId?: string
    defaultCommissionRate?: number
    requiresFssai?: boolean
    isActive?: boolean
    sortOrder?: number
    /** ImageKit fileId; null removes the image */
    imageFileId?: string | null
    /** ImageKit fileId of the small icon; null removes it */
    iconFileId?: string | null
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const catalogApi = {
    uploadAuth: (kind: 'image' | 'icon' = 'image') =>
        Axios.get<{ data: UploadAuth }>('/catalog/categories/upload-auth', { params: { kind } }).then(r => r.data.data),
    listCategories: () => Axios.get<ApiResponse<Category[]>>('/catalog/categories').then(r => r.data),
    getCategory: (id: string) => Axios.get<ApiResponse<CategoryDetail>>(`/catalog/categories/${id}`).then(r => r.data),
    createCategory: (payload: CategoryPayload) => Axios.post<ApiResponse<CategoryDetail>>('/catalog/categories', payload).then(r => r.data),
    updateCategory: (id: string, payload: Partial<Omit<CategoryPayload, 'parentId'>>) =>
        Axios.patch<ApiResponse<CategoryDetail>>(`/catalog/categories/${id}`, payload).then(r => r.data),
    setCategoryStatus: (id: string, isActive: boolean) =>
        Axios.patch<ApiResponse<CategoryDetail>>(`/catalog/categories/${id}/status`, { isActive }).then(r => r.data),
    deleteCategory: (id: string) => Axios.delete<{ success: boolean; message: string }>(`/catalog/categories/${id}`).then(r => r.data),
}

/** A category/sub-category can be deleted only when nothing uses it */
export const isDeletable = (c: { sellersCount?: number; productsCount: number; children?: unknown[]; childrenCount?: number }) =>
    !c.sellersCount && !c.productsCount && !(c.children?.length ?? c.childrenCount ?? 0)
