import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { BanIcon, EyeIcon, FlagIcon, MoreHorizontalIcon, PackageIcon, PowerIcon, SearchIcon, XIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ListPager from '@/components/ListPager'
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from '@/lib/paging'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { catalogAdminApi, type PageMeta, type PlatformProduct, type PlatformProductDetail, type ProductFilter } from '@/api/catalog-admin'
import CatalogTabs from './_component/CatalogTabs'
import PlatformProductDrawer from './_component/PlatformProductDrawer'
import ProductModerationDialog, { type ModerationAction } from './_component/ProductModerationDialog'
import { ProductStatusPill } from './_component/product-status'

const FILTERS: { value: ProductFilter; label: string }[] = [
    { value: 'ALL', label: 'All products' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'FLAGGED', label: 'Flagged' },
    { value: 'OUT_OF_STOCK', label: 'Out of stock' },
    { value: 'INACTIVE', label: 'Hidden by seller' },
    { value: 'BLOCKED', label: 'Deactivated' },
]
const ANY = '__any__'
const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const COLS = 7

/** Global catalog › Products — every listing across every store (design: Admin-Catalog products tab) */
export default function PlatformProductsPage() {
    const { can } = usePermission()
    const canFlag = can('GLOBAL_CATALOG', 'EDIT')
    const canBlock = can('GLOBAL_CATALOG', 'MANAGE')

    const [params, setParams] = useSearchParams()
    const q = params.get('q') ?? ''
    const filter = (params.get('filter') as ProductFilter | null) ?? 'ALL'
    const sellerId = params.get('seller') ?? ''
    const categoryId = params.get('category') ?? ''
    const page = Math.max(1, Number(params.get('page')) || 1)
    const sizeParam = Number(params.get('size'))
    const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE
    const openId = params.get('product')

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

    const [meta, setMetaOpts] = useState<{ sellers: { id: string; name: string }[]; categories: { id: string; name: string }[] }>({ sellers: [], categories: [] })
    useEffect(() => { catalogAdminApi.productsMeta().then(r => setMetaOpts(r.data)).catch(() => {}) }, [])

    const [rows, setRows] = useState<PlatformProduct[]>([])
    const [listMeta, setListMeta] = useState<(PageMeta & { counts: Record<ProductFilter, number> }) | null>(null)
    const [reload, setReload] = useState(0)
    const requestKey = JSON.stringify([q, filter, sellerId, categoryId, page, pageSize, reload])
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const loading = loadedKey !== requestKey

    useEffect(() => {
        const ctrl = new AbortController()
        catalogAdminApi.products({ search: q || undefined, filter, sellerId: sellerId || undefined, categoryId: categoryId || undefined, page, pageSize }, ctrl.signal)
            .then(res => { setRows(res.data); setListMeta(res.meta) })
            .catch(err => { if (!ctrl.signal.aborted) toast.error(getAxiosErrorMessage(err, 'Failed to load products')) })
            .finally(() => { if (!ctrl.signal.aborted) setLoadedKey(requestKey) })
        return () => ctrl.abort()
    }, [q, filter, sellerId, categoryId, page, pageSize, requestKey])

    // Drawer (?product=<id>)
    const [detail, setDetail] = useState<PlatformProductDetail | null>(null)
    useEffect(() => {
        if (!openId) return
        let cancelled = false
        catalogAdminApi.product(openId)
            .then(res => { if (!cancelled) setDetail(res.data) })
            .catch(err => { if (!cancelled) { toast.error(getAxiosErrorMessage(err, 'Could not load product')); update({ product: null }, { replace: true }) } })
        return () => { cancelled = true }
        // only the product id should trigger a load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openId])

    const [action, setAction] = useState<{ id: string; title: string; action: ModerationAction } | null>(null)
    const afterAction = (p: PlatformProductDetail) => {
        if (detail?.id === p.id) setDetail(p)
        setReload(n => n + 1)
    }

    const hasFilters = !!(q || sellerId || categoryId || filter !== 'ALL')

    return (
        <div className='pb-10'>
            <PageHeader title='Global catalog' description='Master categories, attributes, brands, tax classes — and every product listed across the marketplace'>
                <CatalogTabs />
            </PageHeader>

            <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                <div className='relative w-full lg:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input placeholder='Search product, SKU, brand or store…' className='h-10 bg-white pr-9 pl-9' value={searchText} onChange={e => setSearchText(e.target.value)} />
                    {searchText && (
                        <button type='button' onClick={() => setSearchText('')} aria-label='Clear search' className='absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-muted-foreground hover:text-foreground'>
                            <XIcon className='size-3.5' />
                        </button>
                    )}
                </div>
                <div className='flex gap-3'>
                    <Select value={sellerId || ANY} onValueChange={v => update({ seller: v === ANY ? null : v }, { resetPage: true })}>
                        <SelectTrigger className='h-10 w-[180px] cursor-pointer bg-white'><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ANY} className='cursor-pointer'>All stores</SelectItem>
                            {meta.sellers.map(s => <SelectItem key={s.id} value={s.id} className='cursor-pointer'>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={categoryId || ANY} onValueChange={v => update({ category: v === ANY ? null : v }, { resetPage: true })}>
                        <SelectTrigger className='h-10 w-[200px] cursor-pointer bg-white'><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ANY} className='cursor-pointer'>All categories</SelectItem>
                            {meta.categories.map(c => <SelectItem key={c.id} value={c.id} className='cursor-pointer'>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className='mt-3 flex flex-wrap gap-2'>
                {FILTERS.map(f => (
                    <button key={f.value} type='button' onClick={() => update({ filter: f.value === 'ALL' ? null : f.value }, { resetPage: true })}
                        className={cn('inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors',
                            filter === f.value ? 'border-primary bg-primary/10 text-primary' : 'bg-white text-muted-foreground hover:text-foreground')}>
                        {f.label}
                        <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', filter === f.value ? 'bg-primary/15' : 'bg-muted')}>{listMeta?.counts[f.value] ?? '–'}</span>
                    </button>
                ))}
            </div>

            <div className='mt-4 overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead className='hidden md:table-cell'>Store</TableHead>
                            <TableHead className='hidden lg:table-cell'>Category</TableHead>
                            <TableHead className='text-right'>Price</TableHead>
                            <TableHead className='text-right'>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className='text-right'><span className='sr-only'>Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className={cn('bg-white transition-opacity', loading && rows.length > 0 && 'opacity-60')}>
                        {loading && rows.length === 0 && Array.from({ length: 6 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><div className='flex items-center gap-3'><Skeleton className='size-10 rounded-lg' /><Skeleton className='h-4 w-44' /></div></TableCell>
                                {Array.from({ length: COLS - 1 }).map((__, j) => <TableCell key={j} className={cn(j === 0 && 'hidden md:table-cell', j === 1 && 'hidden lg:table-cell')}><Skeleton className='h-4 w-16' /></TableCell>)}
                            </TableRow>
                        ))}
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={COLS} className='py-14 text-center'>
                                    <PackageIcon className='mx-auto size-6 text-muted-foreground' />
                                    <p className='mt-2 text-sm font-semibold'>{hasFilters ? 'No products match these filters' : 'No products listed yet'}</p>
                                    {hasFilters && <Button variant='outline' size='sm' className='mt-3 cursor-pointer' onClick={() => { setSearchText(''); setParams({}) }}>Clear filters</Button>}
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map(p => {
                            const open = () => update({ product: p.id })
                            return (
                                <TableRow key={p.id} onClick={open} data-state={openId === p.id ? 'selected' : undefined} className='cursor-pointer'>
                                    <TableCell>
                                        <div className='flex min-w-0 items-center gap-3'>
                                            {p.imageUrl
                                                ? <img src={p.imageUrl} alt='' className='size-10 shrink-0 rounded-lg border object-cover' />
                                                : <span className='flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted'><PackageIcon className='size-4 text-muted-foreground' /></span>}
                                            <div className='min-w-0'>
                                                <div className='max-w-[280px] truncate font-semibold'>{p.title}</div>
                                                <div className='text-xs text-muted-foreground'>{p.variantCount ? `${p.variantCount} variants` : p.sku ? `SKU ${p.sku}` : '—'}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className='hidden text-sm md:table-cell'>{p.seller.name}</TableCell>
                                    <TableCell className='hidden max-w-[220px] truncate text-sm text-muted-foreground lg:table-cell'>{p.category}</TableCell>
                                    <TableCell className='text-right text-sm font-semibold tabular-nums'>{INR.format(p.price)}{p.priceMax > p.price && <span className='font-normal text-muted-foreground'>+</span>}</TableCell>
                                    <TableCell className={cn('text-right text-sm tabular-nums', p.stock <= 0 ? 'font-semibold text-destructive' : 'text-muted-foreground')}>{p.stock}</TableCell>
                                    <TableCell><ProductStatusPill status={p.status} stock={p.stock} moderation={p.moderation} /></TableCell>
                                    <TableCell className='text-right' onClick={e => e.stopPropagation()}>
                                        <div className='flex items-center justify-end gap-1'>
                                            <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={open}><EyeIcon /> View</Button>
                                            {(canFlag || canBlock) && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${p.title}`}><MoreHorizontalIcon /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align='end' className='w-48'>
                                                        <DropdownMenuItem className='cursor-pointer' onSelect={open}><EyeIcon /> View details</DropdownMenuItem>
                                                        {canFlag && (
                                                            <DropdownMenuItem className='cursor-pointer' onSelect={() => setAction({ id: p.id, title: p.title, action: p.moderation.flagged ? 'UNFLAG' : 'FLAG' })}>
                                                                <FlagIcon /> {p.moderation.flagged ? 'Clear flag' : 'Flag listing'}
                                                            </DropdownMenuItem>
                                                        )}
                                                        {canBlock && <DropdownMenuSeparator />}
                                                        {canBlock && (p.moderation.blocked ? (
                                                            <DropdownMenuItem className='cursor-pointer' onSelect={() => setAction({ id: p.id, title: p.title, action: 'UNBLOCK' })}><PowerIcon /> Reactivate listing</DropdownMenuItem>
                                                        ) : (
                                                            <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setAction({ id: p.id, title: p.title, action: 'BLOCK' })}><BanIcon /> Deactivate listing</DropdownMenuItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
            </div>
            {listMeta && (
                <ListPager page={page} pageSize={pageSize} total={listMeta.total} noun='products' loading={loading}
                    onPage={p => update({ page: p > 1 ? String(p) : null })}
                    onPageSize={s => update({ size: s === DEFAULT_PAGE_SIZE ? null : String(s) }, { resetPage: true })} />
            )}

            <PlatformProductDrawer
                product={detail?.id === openId ? detail : null}
                open={!!openId}
                onOpenChange={o => { if (!o) update({ product: null }, { replace: true }) }}
                canFlag={canFlag}
                canBlock={canBlock}
                onAction={a => detail && setAction({ id: detail.id, title: detail.title, action: a })}
            />

            {action && (
                <ProductModerationDialog key={`${action.id}:${action.action}`} productId={action.id} productTitle={action.title} action={action.action}
                    onClose={() => setAction(null)} onDone={afterAction} />
            )}
        </div>
    )
}
