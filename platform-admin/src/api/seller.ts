import Axios from "@/lib/axios";

export type SellerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
export type BusinessType = 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'HUF' | 'OTHER'
export type KycDocumentType = 'AADHAAR' | 'PAN' | 'BUSINESS_REGISTRATION_CERTIFICATE' | 'FSSAI' | 'OTHER'
export type UploadKind = 'logo' | 'kyc'
export type SellerStatusAction = 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REACTIVATE'

/** A top-level category from Global catalog (managed by the platform admin) */
export interface SellerCategory {
    id: string
    name: string
    description: string | null
    /** Default commission % for sellers in this category */
    commissionRate: number
    requiresFssai: boolean
}

export interface SellerMeta {
    categories: SellerCategory[]
    businessTypes: { value: BusinessType; label: string }[]
    brandColors: string[]
    kycDocuments: { type: KycDocumentType; label: string; fssaiOnly?: boolean }[]
    /** <CUSTOMER_STORE>/seller/ — from the backend .env */
    sellerPageBase: string
}

export interface ISeller {
    id: string
    name: string
    slug: string
    /** Full public page URL, built from CUSTOMER_STORE on the backend */
    publicUrl: string
    categories: { id: string; name: string }[]
    /** Category names joined with ", " */
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

export type KycDocumentStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'

export interface ISellerDetail extends ISeller {
    kycOfflineReference: string | null
    updatedAt: string
    createdBy: { id: string; fullName: string } | null
    businessDetails: {
        legalBusinessName: string
        businessType: BusinessType
        registeredAddress: string
        gstNumber: string | null
        panNumber: string | null
        contactPersonName: string
        contactPersonMobile: string
        contactEmail: string
    } | null
    kycDocuments: {
        id: string
        documentType: KycDocumentType
        fileName: string
        mimeType: string
        status: KycDocumentStatus
        uploadedAt: string
        reviewedAt: string | null
        reviewedBy: { id: string; fullName: string } | null
    }[]
    users: {
        id: string
        fullName: string
        email: string
        phone: string | null
        status: string
        createdAt: string
        lastActiveAt: string | null
        role: { id: string; name: string } | null
    }[]
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
        /** One or more top-level categories */
        categoryIds: string[]
        brandColor: string
        logoFileId?: string
    }
    kyc:
    | { mode: 'UPLOAD'; documents: { documentType: KycDocumentType; fileId: string }[] }
    | { mode: 'OFFLINE'; offlineReference: string }
}

export interface UpdateSellerPayload {
    business?: Partial<Omit<OnboardSellerPayload['business'], 'ownerEmail'>>
    profile?: Partial<OnboardSellerPayload['profile']> & { removeLogo?: boolean }
    /** Requires MANAGE on Sellers */
    commissionRate?: number
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
    get: (id: string) => Axios.get<ApiResponse<ISellerDetail>>(`/sellers/${id}`).then(r => r.data),
    kycDocumentUrl: (sellerId: string, documentId: string) =>
        Axios.get<ApiResponse<{ url: string }>>(`/sellers/${sellerId}/kyc-documents/${documentId}/url`).then(r => r.data),
    slugAvailability: (slug: string) =>
        Axios.get<ApiResponse<{ slug: string; available: boolean; reason: string | null }>>('/sellers/slug-availability', { params: { slug } }).then(r => r.data),
    uploadAuth: (kind: UploadKind) =>
        Axios.get<ApiResponse<UploadAuth>>('/sellers/upload-auth', { params: { kind } }).then(r => r.data),
    onboard: (payload: OnboardSellerPayload) =>
        Axios.post<ApiResponse<ISeller & { inviteSent: boolean }>>('/sellers/onboard', payload).then(r => r.data),
    update: (id: string, payload: UpdateSellerPayload) =>
        Axios.patch<ApiResponse<ISellerDetail>>(`/sellers/${id}`, payload).then(r => r.data),
    changeStatus: (id: string, action: SellerStatusAction) =>
        Axios.patch<ApiResponse<ISellerDetail>>(`/sellers/${id}/status`, { action }).then(r => r.data),
}
