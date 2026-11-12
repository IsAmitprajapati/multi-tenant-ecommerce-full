import { cn } from '@/lib/utils'
import type { Moderation } from '@/api/catalog-admin'

/** One status for a listing, most important first (design: Deactivated / Flagged / Out of stock / Active) */
export function ProductStatusPill({ status, stock, moderation }: { status: 'ACTIVE' | 'INACTIVE'; stock: number; moderation: Moderation }) {
    const [label, cls] = moderation.blocked ? ['Deactivated by platform', 'bg-destructive/10 text-destructive']
        : status === 'INACTIVE' ? ['Hidden by seller', 'bg-muted text-muted-foreground']
            : moderation.flagged ? ['Flagged', 'bg-amber-100 text-amber-800']
                : stock <= 0 ? ['Out of stock', 'bg-destructive/10 text-destructive']
                    : ['Active', 'bg-primary/10 text-primary']
    return <span className={cn('inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', cls)}>{label}</span>
}
