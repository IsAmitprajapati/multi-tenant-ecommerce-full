import Axios from "@/lib/axios";

export type SellerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
export type BusinessType = 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'HUF' | 'OTHER'
export type KycDocumentType = 'AADHAAR' | 'PAN' | 'BUSINESS_REGISTRATION_CERTIFICATE' | 'FSSAI' | 'OTHER'
export type UploadKind = 'logo' | 'kyc'
export type SellerStatusAction = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE'

export interface SellerCategory {
    key: string
    label: string
    commissionRate: number
    requiresFssai: boolean
}

export interface SellerMeta {
    categories: SellerCategory[]
    businessTypes: { value: BusinessType; label: string }[]
    brandColors: string[]
    kycDocuments: { type: KycDocumentType; label: string; fssaiOnly?: boolean }[]
}

export interface ISeller {
    id: string
    name: string
    slug: string
    category: string
    categoryLabel: string
    logoUrl: string | null
    brandColor: string
    status: SellerStatus
    kycStatus: KycStatus
    commissionRate: number
    createdVia: 'SELF_SERVICE' | 'ADMIN_INITIATED'
    createdAt: string
    owner: { id: string; fullName: string; email: string; phone: string | null }
    businessDetails: { legalBusinessName: string } | null
    kycDocumentsCount: number
    usersCount: number
}

export interface UploadAuth {
    token: string
    expire: number
    signature: string
    publicKey: string
    urlEndpoint: string
    folder: string
    isPrivateFile: boolean
    allowedMimeTypes: string[]
    maxBytes: number
}

export interface OnboardSellerPayload {
    business: {
        legalBusinessName: string
        businessType: BusinessType
        registeredAddress: string
        gstNumber?: string
        panNumber?: string
        ownerName: string
        ownerPhone: string
        ownerEmail: string
    }
    profile: {
        name: string
        slug: string
        category: string
        brandColor: string
        logoFileId?: string
    }
    kyc:
    | { mode: 'UPLOAD'; documents: { documentType: KycDocumentType; fileId: string }[] }
    | { mode: 'OFFLINE'; offlineReference: string }
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const sellerApi = {
    meta: () => Axios.get<ApiResponse<SellerMeta>>('/sellers/meta').then(r => r.data),
    list: (params: { search?: string; status?: SellerStatus; kycStatus?: KycStatus } = {}) =>
        Axios.get<ApiResponse<ISeller[]>>('/sellers', { params }).then(r => r.data),
    get: (id: string) => Axios.get<ApiResponse<ISeller>>(`/sellers/${id}`).then(r => r.data),
    slugAvailability: (slug: string) =>
        Axios.get<ApiResponse<{ slug: string; available: boolean; reason: string | null }>>('/sellers/slug-availability', { params: { slug } }).then(r => r.data),
    uploadAuth: (kind: UploadKind) =>
        Axios.get<ApiResponse<UploadAuth>>('/sellers/upload-auth', { params: { kind } }).then(r => r.data),
    onboard: (payload: OnboardSellerPayload) =>
        Axios.post<ApiResponse<ISeller & { inviteSent: boolean }>>('/sellers/onboard', payload).then(r => r.data),
    changeStatus: (id: string, action: SellerStatusAction) =>
        Axios.patch<ApiResponse<ISeller>>(`/sellers/${id}/status`, { action }).then(r => r.data),
}
