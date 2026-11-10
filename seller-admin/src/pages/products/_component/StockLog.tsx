import moment from 'moment'
import { cn } from '@/lib/utils'
import type { CatalogMeta, ProductDetail } from '@/api/products'

/** Stock adjustment log (newest first) */
export default function StockLog({ adjustments, reasons }: { adjustments: ProductDetail['adjustments']; reasons?: CatalogMeta['adjustmentReasons'] }) {
    if (!adjustments.length) return <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>No stock changes yet.</p>
    const label = (r: string) => reasons?.find(x => x.value === r)?.label ?? r.replace(/_/g, ' ').toLowerCase()
    return (
        <ul className='divide-y rounded-lg border'>
            {adjustments.map(a => (
                <li key={a.id} className='flex items-center gap-3 px-3 py-2.5'>
                    <span className={cn('w-14 shrink-0 text-right font-mono text-sm font-bold tabular-nums', a.changeQty > 0 ? 'text-primary' : 'text-destructive')}>
                        {a.changeQty > 0 ? `+${a.changeQty}` : a.changeQty}
                    </span>
                    <div className='min-w-0 flex-1'>
                        <div className='truncate text-sm font-medium'>
                            {label(a.reason)}{a.variant && <span className='text-muted-foreground'> · {a.variant.name}</span>}
                        </div>
                        <div className='truncate text-xs text-muted-foreground'>
                            {a.note ? `${a.note} · ` : ''}{a.adjustedBy?.fullName ?? 'System'} · now {a.resultingQty}
                        </div>
                    </div>
                    <span className='shrink-0 text-xs text-muted-foreground' title={moment(a.createdAt).format('D MMM YYYY, h:mm A')}>{moment(a.createdAt).fromNow()}</span>
                </li>
            ))}
        </ul>
    )
}
