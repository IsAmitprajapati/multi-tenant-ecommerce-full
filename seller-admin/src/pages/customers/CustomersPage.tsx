import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, LockIcon, SearchIcon, UsersIcon, XIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { sellerCustomersApi, type PageMeta, type SellerCustomer } from '@/api/customers'
import { formatINR, initials } from './_component/customer-format'
import SellerCustomerDrawer from './_component/SellerCustomerDrawer'

/** Rows per page — 10 by default */
const PAGE_SIZES = [10, 20, 50] as const
const DEFAULT_PAGE_SIZE = 10
const COLS = 4

function pageList(current: number, count: number): (number | '…')[] {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
    const sorted = [...new Set([1, count, current - 1, current, current + 1].filter(p => p >= 1 && p <= count))].sort((a, b) => a - b)
    return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ['…' as const, p] : [p]))
}

/**
 * Seller admin › Customers — only shoppers who have ordered from this seller, VIEW ONLY, and only:
 * name, number of orders with this seller, total order value, and the order details (drawer).
 */
export default function CustomersPage() {
    const [params, setParams] = useSearchParams()
    const q = params.get('q') ?? ''
    const page = Math.max(1, Number(params.get('page')) || 1)
    const sizeParam = Number(params.get('size'))
    const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE
    const openId = params.get('customer')

    const update = useCallback((patch: Record<string, string | null>, opts: { resetPage?: boolean; replace?: boolean } = {}) => {
        setParams(prev => {
            const next = new URLSearchParams(prev)
            for (const [k, v] of Object.entries(patch)) {
                if (v) next.set(k, v)
                else next.delete(k)
            }
            if (opts.resetPage) next.delete('page')
            return next
        }, { replace: opts.replace })
    }, [setParams])

    const [searchText, setSearchText] = useState(q)
    useEffect(() => {
        const t = setTimeout(() => { if (searchText.trim() !== q) update({ q: searchText.trim() || null }, { resetPage: true, replace: true }) }, 300)
        return () => clearTimeout(t)
    }, [searchText, q, update])

    const [rows, setRows] = useState<SellerCustomer[]>([])
    const [meta, setMeta] = useState<PageMeta | null>(null)
    const requestKey = JSON.stringify([q, page, pageSize])
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const loading = loadedKey !== requestKey

    useEffect(() => {
        const ctrl = new AbortController()
        sellerCustomersApi.list({ search: q || undefined, page, pageSize }, ctrl.signal)
            .then(res => { setRows(res.data); setMeta(res.meta) })
            .catch(err => { if (!ctrl.signal.aborted) toast.error(getAxiosErrorMessage(err, 'Failed to load customers')) })
            .finally(() => { if (!ctrl.signal.aborted) setLoadedKey(requestKey) })
        return () => ctrl.abort()
    }, [q, page, pageSize, requestKey])

    // Drawer (?customer=<id>)
    const [detail, setDetail] = useState<SellerCustomer | null>(null)
    useEffect(() => {
        if (!openId) return
        let cancelled = false
        sellerCustomersApi.get(openId)
            .then(res => { if (!cancelled) setDetail(res.data) })
            .catch(err => { if (!cancelled) { toast.error(getAxiosErrorMessage(err, 'Could not load customer')); update({ customer: null }, { replace: true }) } })
        return () => { cancelled = true }
        // only the customer id should trigger a load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openId])
    const openCustomer = (id: string) => update({ customer: id })

    const total = meta?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
    const lastRow = Math.min(total, page * pageSize)

    return (
        <div>
            <PageHeader
                title='Customers'
                description={!meta ? 'Loading customers…' : q
                    ? `${total.toLocaleString('en-IN')} matching customer${total === 1 ? '' : 's'}`
                    : `${total.toLocaleString('en-IN')} customer${total === 1 ? ' has' : 's have'} ordered from you`}
                actions={<span className='inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground ring-1 ring-border'><LockIcon className='size-3' /> View only</span>}
            />

            <div className='relative w-full md:max-w-xs'>
                <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input placeholder='Search by customer name…' className='h-10 bg-white pr-9 pl-9' value={searchText} onChange={e => setSearchText(e.target.value)} aria-label='Search customers' />
                {searchText && (
                    <button type='button' onClick={() => setSearchText('')} aria-label='Clear search'
                        className='absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground'>
                        <XIcon className='size-3.5' />
                    </button>
                )}
            </div>

            <div className='mt-4 overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer name</TableHead>
                            <TableHead className='text-right'>Orders</TableHead>
                            <TableHead className='text-right'>Total order value</TableHead>
                            <TableHead className='text-right'><span className='sr-only'>Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className={cn('bg-white transition-opacity', loading && rows.length > 0 && 'opacity-60')}>
                        {loading && rows.length === 0 && Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><div className='flex items-center gap-3'><Skeleton className='size-9 rounded-full' /><Skeleton className='h-3.5 w-36' /></div></TableCell>
                                {Array.from({ length: COLS - 1 }).map((__, j) => <TableCell key={j}><Skeleton className='ml-auto h-3.5 w-16' /></TableCell>)}
                            </TableRow>
                        ))}

                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={COLS} className='py-14 text-center whitespace-normal'>
                                    <UsersIcon className='mx-auto size-6 text-muted-foreground' />
                                    <p className='mt-2 text-sm font-semibold'>{q ? 'No customers match your search' : 'No customers yet'}</p>
                                    <p className='mx-auto mt-0.5 max-w-md text-xs text-muted-foreground'>
                                        {q ? 'Try a different name.' : 'Shoppers appear here after they place their first order with your store — you’ll see their name, how many orders they placed with you, the total value and each order’s details.'}
                                    </p>
                                </TableCell>
                            </TableRow>
                        )}

                        {rows.map(c => (
                            <TableRow key={c.id} onClick={() => openCustomer(c.id)} data-state={openId === c.id ? 'selected' : undefined} className='cursor-pointer'>
                                <TableCell>
                                    <div className='flex min-w-0 items-center gap-3'>
                                        <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary'>{initials(c.fullName)}</span>
                                        <span className='max-w-[280px] truncate font-semibold'>{c.fullName}</span>
                                    </div>
                                </TableCell>
                                <TableCell className='text-right text-sm tabular-nums'>{c.ordersCount}</TableCell>
                                <TableCell className='text-right text-sm font-semibold tabular-nums'>{formatINR(c.totalOrderValue)}</TableCell>
                                <TableCell className='text-right'>
                                    <Button size='sm' variant='ghost' className='cursor-pointer text-primary' aria-label={`View ${c.fullName}`}
                                        onClick={e => { e.stopPropagation(); openCustomer(c.id) }}>
                                        <EyeIcon /> View
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {total > 0 && (
                <div className='mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'>
                    <div className='flex flex-wrap items-center gap-4'>
                        <span>{firstRow.toLocaleString('en-IN')}–{lastRow.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} customers</span>
                        <div className='flex items-center gap-2'>
                            <span>Rows per page</span>
                            <Select value={String(pageSize)} onValueChange={v => update({ size: Number(v) === DEFAULT_PAGE_SIZE ? null : v }, { resetPage: true })}>
                                <SelectTrigger size='sm' className='h-8 w-[72px] cursor-pointer bg-white' aria-label='Rows per page'><SelectValue /></SelectTrigger>
                                <SelectContent>{PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)} className='cursor-pointer'>{n}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className='flex items-center gap-1'>
                        <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page <= 1} onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}>
                            <ChevronLeftIcon /> Prev
                        </Button>
                        {pageList(page, pageCount).map((p, i) => p === '…'
                            ? <span key={`gap-${i}`} className='px-1.5'>…</span>
                            : (
                                <Button key={p} size='sm' variant={p === page ? 'default' : 'outline'} className={cn('min-w-8 cursor-pointer', p !== page && 'bg-white')}
                                    aria-current={p === page ? 'page' : undefined} onClick={() => update({ page: p > 1 ? String(p) : null })}>
                                    {p}
                                </Button>
                            ))}
                        <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page >= pageCount} onClick={() => update({ page: String(page + 1) })}>
                            Next <ChevronRightIcon />
                        </Button>
                    </div>
                </div>
            )}

            <SellerCustomerDrawer
                open={!!openId}
                customer={detail?.id === openId ? detail : null}
                onOpenChange={o => { if (!o) update({ customer: null }, { replace: true }) }}
            />
        </div>
    )
}
