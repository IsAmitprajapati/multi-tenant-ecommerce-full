import Axios from "@/lib/axios";

export type SellerStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED'
export type KycStatus = 'PENDING' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED'
export type BusinessType = 'SOLE_PROPRIETORSHIP' | 'PARTNERSHIP' | 'LLP' | 'PRIVATE_LIMITED' | 'PUBLIC_LIMITED' | 'HUF' | 'OTHER'
export type KycDocumentType = 'AADHAAR' | 'PAN' | 'BUSINESS_REGISTRATION_CERTIFICATE' | 'FSSAI' | 'OTHER'
export type UploadKind = 'logo' | 'kyc' | 'product'

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
    /** <CUSTOMER_STORE>/seller/ — from the backend .env */
    sellerPageBase: string
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

/** The seller's own application / seller record */
export interface SellerApplication {
    id: string
    name: string
    slug: string
    publicUrl: string
    category: string
    categoryLabel: string
    logoUrl: string | null
    brandColor: string
    status: SellerStatus
    kycStatus: KycStatus
    commissionRate: number
    createdAt: string
    updatedAt: string
    owner: { id: string; fullName: string; email: string; phone: string | null }
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
    kycDocuments: { id: string; documentType: KycDocumentType; fileName: string; status: 'PENDING' | 'VERIFIED' | 'REJECTED' }[]
}

export interface SellerApplicationPayload {
    business: {
        legalBusinessName: string
        businessType: BusinessType
        registeredAddress: string
        gstNumber?: string
        panNumber?: string
        /** Contact person */
        ownerName: string
        ownerPhone: string
    }
    profile: {
        name: string
        slug: string
        category: string
        brandColor: string
        logoFileId?: string
    }
    kyc: { mode: 'UPLOAD'; documents: { documentType: KycDocumentType; fileId: string }[] }
    acceptTerms: boolean
}

interface ApiResponse<T> {
    success?: boolean
    message?: string
    data: T
}

export const sellerPortalApi = {
    meta: () => Axios.get<ApiResponse<SellerMeta>>('/seller-portal/meta').then(r => r.data),
    slugAvailability: (slug: string) =>
        Axios.get<ApiResponse<{ slug: string; available: boolean; reason: string | null }>>('/seller-portal/slug-availability', { params: { slug } }).then(r => r.data),
    uploadAuth: (kind: UploadKind) =>
        Axios.get<ApiResponse<UploadAuth>>('/seller-portal/upload-auth', { params: { kind } }).then(r => r.data),
    getApplication: () => Axios.get<ApiResponse<SellerApplication | null>>('/seller-portal/application').then(r => r.data),
    submitApplication: (payload: SellerApplicationPayload) =>
        Axios.post<ApiResponse<SellerApplication>>('/seller-portal/application', payload).then(r => r.data),
}
