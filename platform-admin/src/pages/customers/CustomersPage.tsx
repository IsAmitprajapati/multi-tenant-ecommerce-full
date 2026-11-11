import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { ChevronLeftIcon, ChevronRightIcon, EyeIcon, SearchIcon, UsersIcon, XIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { customerApi, type CustomerListMeta, type CustomerStatus, type ICustomer, type ICustomerDetail } from '@/api/customer'
import { CustomerAvatar, CustomerStatusPill } from './_component/customer-ui'
import { formatINR, STATUS_ACTION_COPY } from './_component/customer-format'
import CustomerDrawer from './_component/CustomerDrawer'
import EditCustomerDialog from './_component/EditCustomerDialog'

/** Rows per page — 10 by default (user asked) */
const PAGE_SIZES = [10, 20, 50] as const
const DEFAULT_PAGE_SIZE = 10
const FILTERS: { value: 'ALL' | CustomerStatus; label: string }[] = [
    { value: 'ALL', label: 'All customers' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
]
const COLS = 8

/** Page numbers with gaps: 1 … 4 5 6 … 20 */
function pageList(current: number, count: number): (number | '…')[] {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1)
    const set = new Set([1, count, current - 1, current, current + 1].filter(p => p >= 1 && p <= count))
    const sorted = [...set].sort((a, b) => a - b)
    return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1]! > 1 ? ['…' as const, p] : [p]))
}

/** Platform admin › Customers (design: Admin-Customers) — every shopper account across all stores */
const CustomersPage = () => {
    const { can } = usePermission()
    const canEdit = can('CUSTOMERS', 'EDIT')
    const canManage = can('CUSTOMERS', 'MANAGE')

    // Filters live in the URL so refresh / back keep them
    const [params, setParams] = useSearchParams()
    const q = params.get('q') ?? ''
    const status = (params.get('status') as CustomerStatus | null) ?? undefined
    const from = params.get('from') ?? ''
    const to = params.get('to') ?? ''
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

    // Search box keeps its own text; the URL (and the request) follow 300 ms later
    const [searchText, setSearchText] = useState(q)
    useEffect(() => {
        const t = setTimeout(() => { if (searchText.trim() !== q) update({ q: searchText.trim() || null }, { resetPage: true, replace: true }) }, 300)
        return () => clearTimeout(t)
    }, [searchText, q, update])

    const [rows, setRows] = useState<ICustomer[]>([])
    const [meta, setMeta] = useState<CustomerListMeta | null>(null)
    const [reload, setReload] = useState(0)
    // Loading = the last finished request isn't for the current filters
    const requestKey = JSON.stringify([q, status, from, to, page, pageSize, reload])
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const loading = loadedKey !== requestKey

    useEffect(() => {
        const ctrl = new AbortController()
        customerApi.list({ search: q || undefined, status, from: from || undefined, to: to || undefined, page, pageSize }, ctrl.signal)
            .then(res => { setRows(res.data); setMeta(res.meta) })
            .catch(err => { if (!ctrl.signal.aborted) toast.error(getAxiosErrorMessage(err, 'Failed to load customers')) })
            .finally(() => { if (!ctrl.signal.aborted) setLoadedKey(requestKey) })
        return () => ctrl.abort()
    }, [q, status, from, to, page, pageSize, requestKey])

    // Drawer / edit / status
    const [detail, setDetail] = useState<ICustomerDetail | null>(null)
    const [detailLoadedFor, setDetailLoadedFor] = useState<string | null>(null)
    const [editing, setEditing] = useState<ICustomerDetail | null>(null)
    const [toggling, setToggling] = useState<ICustomerDetail | null>(null)
    const [acting, setActing] = useState(false)

    const openCustomer = (id: string) => update({ customer: id })
    const closeDrawer = useCallback((open: boolean) => { if (!open) update({ customer: null }, { replace: true }) }, [update])

    // Drawer data (?customer=<id>)
    useEffect(() => {
        if (!openId) return
        let cancelled = false
        customerApi.get(openId)
            .then(res => { if (!cancelled) setDetail(res.data) })
            .catch(err => { if (!cancelled) { toast.error(getAxiosErrorMessage(err, 'Could not load customer')); update({ customer: null }, { replace: true }) } })
            .finally(() => { if (!cancelled) setDetailLoadedFor(openId) })
        return () => { cancelled = true }
        // `update` changes with every URL change; only the customer id should trigger a load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openId])
    const drawerCustomer = detail?.id === openId ? detail : null

    /** After an edit / status change — the API returns the fresh customer, so no re-load */
    const applyChange = (c: ICustomerDetail) => {
        setRows(list => list.map(r => (r.id === c.id ? { ...r, ...c } : r)))
        setDetail(c)
    }

    const runToggle = async () => {
        if (!toggling) return
        setActing(true)
        try {
            const res = await customerApi.changeStatus(toggling.id, toggling.status === 'ACTIVE' ? 'DEACTIVATE' : 'REACTIVATE')
            toast.success(res.message ?? 'Updated')
            applyChange(res.data)
            setReload(n => n + 1) // status counts
            setToggling(null)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setActing(false)
        }
    }

    const total = meta?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / pageSize))
    const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
    const lastRow = Math.min(total, page * pageSize)
    const hasFilters = !!(q || status || from || to)
    const all = meta?.statusCounts.ALL ?? 0

    // A deep link to a page past the end (e.g. after filtering) goes to the last page
    useEffect(() => { if (meta && page > pageCount) update({ page: pageCount > 1 ? String(pageCount) : null }, { replace: true }) }, [meta, page, pageCount, update])

    const copy = toggling && STATUS_ACTION_COPY[toggling.status === 'ACTIVE' ? 'DEACTIVATE' : 'REACTIVATE']

    return (
        <div>
            <PageHeader
                title='Customers'
                description={!meta ? 'Loading customers…' : hasFilters
                    ? `${total.toLocaleString('en-IN')} matching customer${total === 1 ? '' : 's'}`
                    : `${all.toLocaleString('en-IN')} customer${all === 1 ? '' : 's'} across every store on the platform${meta.newThisMonth ? ` · ${meta.newThisMonth.toLocaleString('en-IN')} new this month` : ''}`}
            />

            {/* Filters (design: search + Registered from / to) */}
            <div className='flex flex-col gap-3 lg:flex-row lg:items-end'>
                <div className='relative w-full lg:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input placeholder='Search by name, email or phone…' className='h-10 bg-white pr-9 pl-9' value={searchText} onChange={e => setSearchText(e.target.value)} aria-label='Search customers' />
                    {searchText && (
                        <button type='button' onClick={() => setSearchText('')} aria-label='Clear search'
                            className='absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground'>
                            <XIcon className='size-3.5' />
                        </button>
                    )}
                </div>
                <div className='flex items-end gap-3'>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='reg-from' className='text-xs font-semibold text-muted-foreground'>Registered from</Label>
                        <Input id='reg-from' type='date' className='h-10 w-[160px] bg-white' value={from} max={to || undefined}
                            onChange={e => update({ from: e.target.value || null }, { resetPage: true })} />
                    </div>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='reg-to' className='text-xs font-semibold text-muted-foreground'>to</Label>
                        <Input id='reg-to' type='date' className='h-10 w-[160px] bg-white' value={to} min={from || undefined}
                            onChange={e => update({ to: e.target.value || null }, { resetPage: true })} />
                    </div>
                    {(from || to) && (
                        <Button variant='ghost' size='sm' className='h-10 cursor-pointer text-muted-foreground' onClick={() => update({ from: null, to: null }, { resetPage: true })}>
                            Clear dates
                        </Button>
                    )}
                </div>
                <div className='flex flex-wrap gap-2 lg:ml-auto'>
                    {FILTERS.map(f => {
                        const on = (status ?? 'ALL') === f.value
                        return (
                            <button key={f.value} type='button' onClick={() => update({ status: f.value === 'ALL' ? null : f.value }, { resetPage: true })}
                                className={cn(
                                    'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors',
                                    on ? 'border-primary bg-primary/10 text-primary' : 'bg-white text-muted-foreground hover:text-foreground'
                                )}>
                                {f.label}
                                <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', on ? 'bg-primary/15' : 'bg-muted')}>{meta?.statusCounts[f.value] ?? '–'}</span>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Table (design columns: Customer · Orders · Lifetime value · Last order · Status) */}
            <div className='mt-4 overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead className='hidden md:table-cell'>Phone</TableHead>
                            <TableHead className='text-right'>Orders</TableHead>
                            <TableHead className='text-right'>Lifetime value</TableHead>
                            <TableHead className='hidden lg:table-cell'>Last order</TableHead>
                            <TableHead className='hidden sm:table-cell'>Joined</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'><span className='sr-only'>Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className={cn('bg-white transition-opacity', loading && rows.length > 0 && 'opacity-60')}>
                        {loading && rows.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><div className='flex items-center gap-3'><Skeleton className='size-9 rounded-full' /><div className='grid gap-1.5'><Skeleton className='h-3.5 w-32' /><Skeleton className='h-3 w-44' /></div></div></TableCell>
                                {Array.from({ length: COLS - 1 }).map((__, j) => <TableCell key={j} className={cn(j === 0 && 'hidden md:table-cell', j === 3 && 'hidden lg:table-cell', j === 4 && 'hidden sm:table-cell')}><Skeleton className='h-3.5 w-16' /></TableCell>)}
                            </TableRow>
                        ))}

                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={COLS} className='py-14 text-center'>
                                    <UsersIcon className='mx-auto size-6 text-muted-foreground' />
                                    <p className='mt-2 text-sm font-semibold'>{hasFilters ? 'No customers match these filters' : 'No customers yet'}</p>
                                    <p className='mt-0.5 text-xs text-muted-foreground'>{hasFilters ? 'Try a different name, email or date range.' : 'Shoppers appear here when they sign up on the storefront.'}</p>
                                    {hasFilters && (
                                        <Button variant='outline' size='sm' className='mt-3 cursor-pointer' onClick={() => { setSearchText(''); setParams({}) }}>Clear filters</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )}

                        {rows.map(c => (
                            <TableRow key={c.id} onClick={() => openCustomer(c.id)} data-state={openId === c.id ? 'selected' : undefined} className='cursor-pointer'>
                                <TableCell>
                                    <button type='button' className='group flex min-w-0 cursor-pointer items-center gap-3 text-left' onClick={e => { e.stopPropagation(); openCustomer(c.id) }}>
                                        <CustomerAvatar name={c.fullName} />
                                        <div className='min-w-0'>
                                            <div className='max-w-[240px] truncate font-semibold group-hover:text-primary'>{c.fullName}</div>
                                            <div className='max-w-[240px] truncate text-xs text-muted-foreground'>{c.email}</div>
                                        </div>
                                    </button>
                                </TableCell>
                                <TableCell className='hidden text-sm md:table-cell'>{c.phone ?? <span className='text-muted-foreground'>—</span>}</TableCell>
                                <TableCell className='text-right text-sm tabular-nums'>{c.ordersCount}</TableCell>
                                <TableCell className='text-right text-sm font-semibold tabular-nums'>{formatINR(c.lifetimeValue)}</TableCell>
                                <TableCell className='hidden text-sm text-muted-foreground lg:table-cell'>{c.lastOrderAt ? moment(c.lastOrderAt).fromNow() : '—'}</TableCell>
                                <TableCell className='hidden text-sm text-muted-foreground sm:table-cell' title={moment(c.createdAt).format('D MMM YYYY, h:mm a')}>{moment(c.createdAt).format('D MMM YYYY')}</TableCell>
                                <TableCell><CustomerStatusPill status={c.status} /></TableCell>
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

            {/* Pagination */}
            {total > 0 && (
                <div className='mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground'>
                    <div className='flex flex-wrap items-center gap-4'>
                        <span>{firstRow.toLocaleString('en-IN')}–{lastRow.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')} customers</span>
                        <div className='flex items-center gap-2'>
                            <span>Rows per page</span>
                            <Select value={String(pageSize)} onValueChange={v => update({ size: Number(v) === DEFAULT_PAGE_SIZE ? null : v }, { resetPage: true })}>
                                <SelectTrigger size='sm' className='h-8 w-[72px] cursor-pointer bg-white' aria-label='Rows per page'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {PAGE_SIZES.map(n => <SelectItem key={n} value={String(n)} className='cursor-pointer'>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className='flex items-center gap-1'>
                        <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page <= 1}
                            onClick={() => update({ page: page - 1 > 1 ? String(page - 1) : null })}>
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
                        <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page >= pageCount}
                            onClick={() => update({ page: String(page + 1) })}>
                            Next <ChevronRightIcon />
                        </Button>
                    </div>
                </div>
            )}

            <CustomerDrawer
                open={!!openId}
                customer={drawerCustomer}
                loading={!!openId && detailLoadedFor !== openId}
                onOpenChange={closeDrawer}
                canEdit={canEdit}
                canManage={canManage}
                onEdit={setEditing}
                onToggleStatus={setToggling}
            />

            {editing && (
                <EditCustomerDialog key={editing.id} customer={editing} open onOpenChange={o => !o && setEditing(null)} onSaved={applyChange} />
            )}

            {toggling && copy && (
                <ConfirmDialog
                    open
                    onOpenChange={o => !o && !acting && setToggling(null)}
                    title={copy.title(toggling.fullName)}
                    description={copy.description}
                    confirmLabel={copy.confirm}
                    destructive={copy.destructive}
                    loading={acting}
                    onConfirm={runToggle}
                />
            )}
        </div>
    )
}

export default CustomersPage
