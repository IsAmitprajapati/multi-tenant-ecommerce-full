import Axios from "@/lib/axios";
import type { UserType } from "@/lib/permissions";

export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

export interface getAdminuserPayload {
    search?: string
    userId?: string
    roleId?: string
    status?: AdminUserStatus
    userType?: UserType
}

export interface AdminUserPayload {
    fullName: string
    email: string
    phone?: string
    password?: string
    roleId: string
}

export const userApi = {
    getAdminUsers: (params: getAdminuserPayload) =>
        Axios.get('/users/admin', { params: params }).then(res => res?.data),
    createAdminUser: (payload: AdminUserPayload) =>
        Axios.post('/users/admin', payload).then(res => res.data),
    updateAdminUser: (id: string, payload: Partial<AdminUserPayload>) =>
        Axios.patch(`/users/admin/${id}`, payload).then(res => res.data),
    assignRole: (id: string, roleId: string) =>
        Axios.patch(`/users/admin/${id}/role`, { roleId }).then(res => res.data),
    updateStatus: (id: string, status: AdminUserStatus) =>
        Axios.patch(`/users/admin/${id}/status`, { status }).then(res => res.data),
}
