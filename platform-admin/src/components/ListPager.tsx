import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { PAGE_SIZES } from '@/lib/paging'

/** Page numbers with gaps: 1 … 4 5 6 … 20 */
function pageList(current: number, count: number): (number | '…')[] {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
    const sorted = [...new Set([1, count, current - 1, current, current + 1].filter(p => p >= 1 && p <= count))].sort((a, b) => a - b)
    return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ['…' as const, p] : [p]))
}

/** "1–10 of 41 products · Rows per page [10] · Prev 1 2 3 Next" for server-paged lists */
export default function ListPager({ page, pageSize, total, noun, loading, onPage, onPageSize }: {
    page: number
    pageSize: number
    total: number
    noun: string
    loading?: boolean
    onPage: (page: number) => void
    onPageSize?: (size: number) => void
}) {
    if (total <= 0) return null
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const from = (page - 1) * pageSize + 1
    const to = Math.min(total, page * pageSize)
    return (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'>
            <div className='flex flex-wrap items-center gap-4'>
                <span>{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} {noun}</span>
                {onPageSize && (
                    <div className='flex items-center gap-2'>
                        <span>Rows per page</span>
                        <Select value={String(pageSize)} onValueChange={v => onPageSize(Number(v))}>
                            <SelectTrigger size='sm' className='h-8 w-[72px] cursor-pointer bg-white' aria-label='Rows per page'><SelectValue /></SelectTrigger>
                            <SelectContent>{PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)} className='cursor-pointer'>{n}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                )}
            </div>
            <div className='flex items-center gap-1'>
                <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>
                    <ChevronLeftIcon /> Prev
                </Button>
                {pageList(page, pageCount).map((p, i) => p === '…'
                    ? <span key={`gap-${i}`} className='px-1.5'>…</span>
                    : (
                        <Button key={p} size='sm' variant={p === page ? 'default' : 'outline'} className={cn('min-w-8 cursor-pointer', p !== page && 'bg-white')}
                            aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}>
                            {p}
                        </Button>
                    ))}
                <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page >= pageCount} onClick={() => onPage(page + 1)}>
                    Next <ChevronRightIcon />
                </Button>
            </div>
        </div>
    )
}
