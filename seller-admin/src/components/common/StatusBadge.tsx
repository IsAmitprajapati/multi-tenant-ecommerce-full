import { cn } from '@/lib/utils'

const STYLES: Record<string, { label: string; className: string; dot: string }> = {
    ACTIVE: { label: 'Active', className: 'bg-primary/10 text-primary', dot: 'bg-primary' },
    INACTIVE: { label: 'Inactive', className: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground' },
    SUSPENDED: { label: 'Suspended', className: 'bg-destructive/10 text-destructive', dot: 'bg-destructive' },
}

const StatusBadge = ({ status, className }: { status?: string; className?: string }) => {
    const s = STYLES[status ?? ''] ?? STYLES.INACTIVE
    return (
        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold', s.className, className)}>
            <span className={cn('size-1.5 rounded-full', s.dot)} />
            {s.label}
        </span>
    )
}

export default StatusBadge
