import { cn } from '@/lib/utils'
import type { KycStatus, SellerStatus, SellerStatusAction } from '@/api/seller'

/** Shared seller status UI — used by the Sellers list and the seller detail page */
export const STATUS_PILL: Record<SellerStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Active', className: 'bg-primary/10 text-primary' },
    PENDING: { label: 'Pending', className: 'bg-amber-100 text-amber-800' },
    SUSPENDED: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
}

export const KYC_PILL: Record<KycStatus, { label: string; className: string }> = {
    VERIFIED: { label: 'Verified', className: 'bg-primary/10 text-primary' },
    UNDER_REVIEW: { label: 'Under review', className: 'bg-amber-100 text-amber-800' },
    PENDING: { label: 'Not submitted', className: 'bg-muted text-muted-foreground' },
    REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
}

export const Pill = ({ label, className }: { label: string; className: string }) => (
    <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', className)}>{label}</span>
)

export const ACTION_COPY: Record<SellerStatusAction, { title: (n: string) => string; description: string; confirm: string; destructive: boolean }> = {
    APPROVE: { title: n => `Approve KYC for ${n}?`, description: 'All pending documents will be marked verified.', confirm: 'Approve', destructive: false },
    REJECT: { title: n => `Reject KYC for ${n}?`, description: 'Pending documents will be marked rejected. The seller will need to re-submit.', confirm: 'Reject KYC', destructive: true },
    SUSPEND: { title: n => `Suspend ${n}?`, description: 'Their listings stop selling and every seller user is signed out immediately.', confirm: 'Suspend seller', destructive: true },
    REACTIVATE: { title: n => `Reactivate ${n}?`, description: 'The seller can sign in and sell again.', confirm: 'Reactivate', destructive: false },
}

export const isKycReviewable = (k: KycStatus) => k === 'UNDER_REVIEW' || k === 'PENDING'

export const BUSINESS_TYPE_LABEL: Record<string, string> = {
    SOLE_PROPRIETORSHIP: 'Sole proprietorship',
    PARTNERSHIP: 'Partnership',
    LLP: 'LLP',
    PRIVATE_LIMITED: 'Private limited company',
    PUBLIC_LIMITED: 'Public limited company',
    HUF: 'HUF',
    OTHER: 'Other',
}

export const KYC_DOCUMENT_LABEL: Record<string, string> = {
    AADHAAR: 'Aadhaar',
    PAN: 'PAN',
    BUSINESS_REGISTRATION_CERTIFICATE: 'Business registration certificate',
    FSSAI: 'FSSAI license',
    OTHER: 'Other document',
}

export const KYC_DOC_PILL: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'Pending review', className: 'bg-amber-100 text-amber-800' },
    VERIFIED: { label: 'Verified', className: 'bg-primary/10 text-primary' },
    REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
}
