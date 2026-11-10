import Axios from "@/lib/axios";
import type { PermissionLevel, PermissionModule } from "@/lib/permissions";

export type StaffStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'

export interface IStaff {
    id: string
    fullName: string
    email: string
    phone: string | null
    status: StaffStatus
    createdAt: string
    role: { id: string; name: string; status: string } | null
    isOwner: boolean
    lastActiveAt: string | null
    /** Never signed in yet */
    invitePending: boolean
}

export interface ISellerRole {
    id: string
    name: string
    description: string | null
    /** This seller's staff with the role */
    staffCount: number
    permissions: { module: PermissionModule; level: PermissionLevel }[]
}

export interface ISellerRoleDetail extends ISellerRole {
    /** This seller's staff who have the role */
    staff: IStaff[]
}

export interface StaffPayload {
    fullName: string
    email: string
    phone?: string
    roleId: string
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const teamApi = {
    listStaff: () => Axios.get<ApiResponse<IStaff[]>>('/seller-portal/staff').then(r => r.data),
    getStaff: (id: string) => Axios.get<ApiResponse<IStaff>>(`/seller-portal/staff/${id}`).then(r => r.data),
    createStaff: (payload: StaffPayload) =>
        Axios.post<ApiResponse<IStaff & { inviteSent: boolean }>>('/seller-portal/staff', payload).then(r => r.data),
    updateStaff: (id: string, payload: Partial<Omit<StaffPayload, 'email'>>) =>
        Axios.patch<ApiResponse<IStaff>>(`/seller-portal/staff/${id}`, payload).then(r => r.data),
    setStatus: (id: string, status: StaffStatus) =>
        Axios.patch<ApiResponse<IStaff>>(`/seller-portal/staff/${id}/status`, { status }).then(r => r.data),
    resendInvite: (id: string) =>
        Axios.post<{ success: boolean; message: string }>(`/seller-portal/staff/${id}/resend-invite`).then(r => r.data),
    listRoles: () => Axios.get<ApiResponse<ISellerRole[]>>('/seller-portal/roles').then(r => r.data),
    getRole: (id: string) => Axios.get<ApiResponse<ISellerRoleDetail>>(`/seller-portal/roles/${id}`).then(r => r.data),
}
