import Axios from "@/lib/axios";

export interface SubCategory {
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
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const catalogApi = {
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
