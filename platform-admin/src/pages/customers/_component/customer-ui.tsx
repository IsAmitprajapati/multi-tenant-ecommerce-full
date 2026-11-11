import { cn } from '@/lib/utils'
import type { CustomerStatus } from '@/api/customer'
import { CUSTOMER_STATUS_PILL, initials } from './customer-format'

export const CustomerStatusPill = ({ status }: { status: CustomerStatus }) => {
    const p = CUSTOMER_STATUS_PILL[status]
    return <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', p.className)}>{p.label}</span>
}

export const CustomerAvatar = ({ name, className }: { name: string; className?: string }) => (
    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary', className)}>
        {initials(name)}
    </span>
)
