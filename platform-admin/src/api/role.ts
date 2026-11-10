import Axios from "@/lib/axios";
import type { PermissionLevel, PermissionModule, UserType } from "@/lib/permissions";

export type RoleStatus = 'ACTIVE' | 'INACTIVE'

export interface IRolePermission {
    module: PermissionModule
    level: PermissionLevel
}

export interface IRoleItem {
    id: string
    name: string
    description: string | null
    isSystem: boolean
    userType: UserType
    status: RoleStatus
    usersCount: number
    permissions: IRolePermission[]
    createdAt: string
    updatedAt: string
}

export interface RolePayload {
    name: string
    description?: string
    permissions: IRolePermission[]
}

export interface ListRolesParams {
    search?: string
    status?: RoleStatus
    userType?: UserType
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const roleApi = {
    list: (params: ListRolesParams = {}) =>
        Axios.get<ApiResponse<IRoleItem[]>>('/roles', { params }).then(res => res.data),
    get: (id: string) =>
        Axios.get<ApiResponse<IRoleItem>>(`/roles/${id}`).then(res => res.data),
    create: (payload: RolePayload) =>
        Axios.post<ApiResponse<IRoleItem>>('/roles', payload).then(res => res.data),
    update: (id: string, payload: Partial<RolePayload>) =>
        Axios.patch<ApiResponse<IRoleItem>>(`/roles/${id}`, payload).then(res => res.data),
    updateStatus: (id: string, status: RoleStatus) =>
        Axios.patch<ApiResponse<IRoleItem>>(`/roles/${id}/status`, { status }).then(res => res.data),
    remove: (id: string) =>
        Axios.delete<{ success: boolean; message: string }>(`/roles/${id}`).then(res => res.data),
}
