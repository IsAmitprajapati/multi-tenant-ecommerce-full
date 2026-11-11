import type { CustomerStatus, CustomerStatusAction } from '@/api/customer'

export const CUSTOMER_STATUS_PILL: Record<CustomerStatus, { label: string; className: string }> = {
    ACTIVE: { label: 'Active', className: 'bg-primary/10 text-primary' },
    INACTIVE: { label: 'Inactive', className: 'bg-muted text-muted-foreground' },
    SUSPENDED: { label: 'Suspended', className: 'bg-destructive/10 text-destructive' },
}

export const STATUS_ACTION_COPY: Record<CustomerStatusAction, { title: (n: string) => string; description: string; confirm: string; destructive: boolean }> = {
    DEACTIVATE: {
        title: n => `Deactivate ${n}?`,
        description: 'They are signed out on every device and can’t log in or place orders until you reactivate the account. Their cart, wishlist and reviews are kept.',
        confirm: 'Deactivate',
        destructive: true,
    },
    REACTIVATE: { title: n => `Reactivate ${n}?`, description: 'They can log in and shop again.', confirm: 'Reactivate', destructive: false },
}

export const initials = (name: string) =>
    name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
export const formatINR = (n: number) => INR.format(n)
