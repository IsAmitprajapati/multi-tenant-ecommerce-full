import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import moment from 'moment'
import { PowerIcon, SearchIcon, TagIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ListPager from '@/components/ListPager'
import { DEFAULT_PAGE_SIZE } from '@/lib/paging'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { catalogAdminApi, type CatalogBrand, type PageMeta } from '@/api/catalog-admin'
import CatalogTabs from './_component/CatalogTabs'
import { ActiveBadge } from './_component/catalog-ui'

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE'
const FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'ALL', label: 'All brands' }, { value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Deactivated' },
]
const COLORS = ['#1B7A4F', '#D0455A', '#2E77D0', '#C98A2E', '#7B5CD6', '#0EA5A0', '#8A5A0A', '#B23139']
const colorOf = (name: string) => COLORS[[...name].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length]

/** Global catalog › Brands — every brand sellers have created; the platform can deactivate one */
export default function BrandsPage() {
    const { can } = usePermission()
    const canEdit = can('GLOBAL_CATALOG', 'EDIT')
    const [searchText, setSearchText] = useState('')
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState<StatusFilter>('ALL')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [reload, setReload] = useState(0)
    const [rows, setRows] = useState<CatalogBrand[]>([])
    const [meta, setMeta] = useState<(PageMeta & { counts: Record<StatusFilter, number> }) | null>(null)
    const requestKey = JSON.stringify([search, status, page, pageSize, reload])
    const [loadedKey, setLoadedKey] = useState<string | null>(null)
    const loading = loadedKey !== requestKey
    const [pending, setPending] = useState<CatalogBrand | null>(null)
    const [acting, setActing] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => { if (searchText.trim() !== search) { setSearch(searchText.trim()); setPage(1) } }, 300)
        return () => clearTimeout(t)
    }, [searchText, search])

    useEffect(() => {
        const ctrl = new AbortController()
        catalogAdminApi.brands({ search: search || undefined, status: status === 'ALL' ? undefined : status, page, pageSize }, ctrl.signal)
            .then(res => { setRows(res.data); setMeta(res.meta) })
            .catch(err => { if (!ctrl.signal.aborted) toast.error(getAxiosErrorMessage(err, 'Failed to load brands')) })
            .finally(() => { if (!ctrl.signal.aborted) setLoadedKey(requestKey) })
        return () => ctrl.abort()
    }, [search, status, page, pageSize, requestKey])

    const runToggle = async () => {
        if (!pending) return
        setActing(true)
        try {
            const res = await catalogAdminApi.brandStatus(pending.id, !pending.isActive)
            toast.success(res.message)
            setPending(null)
            setReload(n => n + 1)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setActing(false)
        }
    }

    const cols = canEdit ? 6 : 5
    return (
        <div className='pb-10'>
            <PageHeader title='Global catalog' description='Master categories, attributes, brands, tax classes — and every product listed across the marketplace'>
                <CatalogTabs />
            </PageHeader>

            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                <div className='relative w-full md:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input placeholder='Search brands or sellers…' className='h-10 bg-white pl-9' value={searchText} onChange={e => setSearchText(e.target.value)} />
                </div>
                <div className='flex flex-wrap gap-2 md:ml-auto'>
                    {FILTERS.map(f => (
                        <button key={f.value} type='button' onClick={() => { setStatus(f.value); setPage(1) }}
                            className={cn('inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors',
                                status === f.value ? 'border-primary bg-primary/10 text-primary' : 'bg-white text-muted-foreground hover:text-foreground')}>
                            {f.label}
                            <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', status === f.value ? 'bg-primary/15' : 'bg-muted')}>{meta?.counts[f.value] ?? '–'}</span>
                        </button>
                    ))}
                </div>
            </div>
            <p className='mt-3 text-xs text-muted-foreground'>Sellers create brands when they add products. A deactivated brand can’t be used for new or edited products; existing listings keep it.</p>

            <div className='mt-3 overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Brand</TableHead>
                            <TableHead>Seller</TableHead>
                            <TableHead className='text-right'>Products</TableHead>
                            <TableHead className='hidden md:table-cell'>Added</TableHead>
                            <TableHead>Status</TableHead>
                            {canEdit && <TableHead className='text-right'>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody className={cn('bg-white transition-opacity', loading && rows.length > 0 && 'opacity-60')}>
                        {loading && rows.length === 0 && [0, 1, 2, 3].map(i => (
                            <TableRow key={i}>{Array.from({ length: cols }).map((_, j) => <TableCell key={j}><Skeleton className='h-4 w-24' /></TableCell>)}</TableRow>
                        ))}
                        {!loading && rows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={cols} className='py-14 text-center'>
                                    <TagIcon className='mx-auto size-6 text-muted-foreground' />
                                    <p className='mt-2 text-sm font-semibold'>{search || status !== 'ALL' ? 'No brands match' : 'No brands yet'}</p>
                                </TableCell>
                            </TableRow>
                        )}
                        {rows.map(b => (
                            <TableRow key={b.id} className={cn(!b.isActive && 'opacity-60')}>
                                <TableCell>
                                    <div className='flex items-center gap-3'>
                                        <span className='flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white' style={{ background: colorOf(b.name) }}>{b.name.slice(0, 1).toUpperCase()}</span>
                                        <span className='font-semibold'>{b.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className='text-sm'>{b.seller.name}</TableCell>
                                <TableCell className='text-right text-sm tabular-nums'>{b.productsCount}</TableCell>
                                <TableCell className='hidden text-sm text-muted-foreground md:table-cell'>{moment(b.createdAt).format('D MMM YYYY')}</TableCell>
                                <TableCell><ActiveBadge active={b.isActive} /></TableCell>
                                {canEdit && (
                                    <TableCell className='text-right'>
                                        <Button size='sm' variant='ghost' className={cn('cursor-pointer', b.isActive ? 'text-destructive hover:text-destructive' : 'text-primary')} onClick={() => setPending(b)}>
                                            <PowerIcon /> {b.isActive ? 'Deactivate' : 'Reactivate'}
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            {meta && <ListPager page={page} pageSize={pageSize} total={meta.total} noun='brands' loading={loading} onPage={setPage} onPageSize={s => { setPageSize(s); setPage(1) }} />}

            {pending && (
                <ConfirmDialog
                    open
                    onOpenChange={o => !o && !acting && setPending(null)}
                    title={pending.isActive ? `Deactivate ${pending.name}?` : `Reactivate ${pending.name}?`}
                    description={pending.isActive
                        ? `${pending.seller.name} won’t be able to use this brand for new or edited products. Its ${pending.productsCount} existing product${pending.productsCount === 1 ? '' : 's'} stay listed.`
                        : 'Sellers can use this brand again.'}
                    confirmLabel={pending.isActive ? 'Deactivate' : 'Reactivate'}
                    destructive={pending.isActive}
                    loading={acting}
                    onConfirm={runToggle}
                />
            )}
        </div>
    )
}
