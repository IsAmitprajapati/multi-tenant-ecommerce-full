import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import { EyeIcon, MoreHorizontalIcon, PackageIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { productsApi, type CatalogMeta, type ProductListItem, type ProductStatus, type StockStatus } from '@/api/products'
import { inr, ProductThumb, StockPill, VisibilityPill } from './_component/product-ui'
import type { ProductPreview } from './_component/ProductSkeletons'

const previewOf = (p: ProductListItem): { preview: ProductPreview } => ({
    preview: { title: p.title, imageUrl: p.imageUrl, status: p.status, stockStatus: p.stockStatus, category: p.category },
})

const col = createColumnHelper<DataTableFeatures, ProductListItem>()

export default function ProductsPage() {
    const navigate = useNavigate()
    const { can } = usePermission()
    const canEdit = can('SELLER_PRODUCTS', 'EDIT')
    const canDelete = can('SELLER_PRODUCTS', 'MANAGE')

    const [items, setItems] = useState<ProductListItem[]>([])
    const [meta, setMeta] = useState<CatalogMeta | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState('ALL')
    const [stock, setStock] = useState<'ALL' | StockStatus>('ALL')
    const [visibility, setVisibility] = useState<'ALL' | ProductStatus>('ALL')
    const [confirm, setConfirm] = useState<{ type: 'delete' | 'status'; product: ProductListItem } | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        Promise.all([productsApi.list(), productsApi.meta()])
            .then(([p, m]) => { setItems(p.data); setMeta(m.data) })
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load products')))
            .finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return items.filter(p =>
            (category === 'ALL' || p.category.id === category || meta?.categories.find(c => c.id === category)?.children.some(ch => ch.id === p.category.id)) &&
            (stock === 'ALL' || p.stockStatus === stock) &&
            (visibility === 'ALL' || p.status === visibility) &&
            (!q || p.title.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)))
    }, [items, search, category, stock, visibility, meta])

    const categoryCount = new Set(items.map(p => p.category.id)).size
    const filtersOn = search || category !== 'ALL' || stock !== 'ALL' || visibility !== 'ALL'

    const runConfirm = async () => {
        if (!confirm) return
        setBusy(true)
        try {
            if (confirm.type === 'delete') {
                const res = await productsApi.remove(confirm.product.id)
                setItems(list => list.filter(p => p.id !== confirm.product.id))
                toast.success(res.message)
            } else {
                const next = confirm.product.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
                const res = await productsApi.setStatus(confirm.product.id, next)
                setItems(list => list.map(p => (p.id === confirm.product.id ? { ...p, status: next } : p)))
                toast.success(res.message ?? 'Updated')
            }
            setConfirm(null)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Something went wrong'))
        } finally { setBusy(false) }
    }

    const columns = col.columns([
        col.accessor('title', {
            header: 'Product',
            cell: ({ row }) => {
                const p = row.original
                return (
                    <Link to={`/dashboard/products/${p.id}`} state={previewOf(p)} className='group flex items-center gap-3'>
                        <ProductThumb url={p.imageUrl} title={p.title} />
                        <div className='min-w-0'>
                            <div className='truncate font-semibold group-hover:text-primary'>{p.title}</div>
                            <div className='truncate text-xs text-muted-foreground'>
                                {p.variantCount ? `${p.variantCount} variant${p.variantCount > 1 ? 's' : ''}` : p.sku ? `SKU ${p.sku}` : 'No SKU'}
                            </div>
                        </div>
                    </Link>
                )
            },
        }),
        col.accessor('category', {
            header: 'Category',
            cell: ({ row }) => (
                <div>
                    <div className='text-sm'>{row.original.category.name}</div>
                    {row.original.category.parentName && <div className='text-xs text-muted-foreground'>{row.original.category.parentName}</div>}
                </div>
            ),
        }),
        col.accessor('price', {
            header: 'Price',
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className='whitespace-nowrap'>
                        <span className='font-semibold'>{p.price !== p.priceMax ? `${inr(p.price)} – ${inr(p.priceMax)}` : inr(p.price)}</span>
                        {p.compareAtPrice != null && p.compareAtPrice > p.price && <span className='ml-1.5 text-xs text-muted-foreground line-through'>{inr(p.compareAtPrice)}</span>}
                    </div>
                )
            },
        }),
        col.accessor('stock', {
            header: 'Stock',
            cell: ({ row }) => (
                <div className='flex flex-col gap-1'>
                    <span className={cn('text-sm font-semibold tabular-nums', row.original.stockStatus !== 'IN' && 'text-destructive')}>
                        {row.original.stockStatus === 'LOW' ? `${row.original.stock} left` : row.original.stock}
                    </span>
                    <StockPill status={row.original.stockStatus} />
                </div>
            ),
        }),
        col.accessor('status', {
            header: 'Visibility',
            cell: ({ row }) => <VisibilityPill status={row.original.status} />,
        }),
        col.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const p = row.original
                return (
                    <div className='flex items-center justify-end gap-1'>
                        <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={() => navigate(`/dashboard/products/${p.id}`, { state: previewOf(p) })}><EyeIcon /> View</Button>
                        {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${p.title}`}><MoreHorizontalIcon /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='w-48'>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`/dashboard/products/${p.id}`, { state: previewOf(p) })}><EyeIcon /> View product</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`/dashboard/products/${p.id}/edit`, { state: previewOf(p) })}><PencilIcon /> Edit product</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => setConfirm({ type: 'status', product: p })}>
                                        <PowerIcon /> {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                    {/* Delete only while the product has never been ordered */}
                                    {canDelete && p.canDelete && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setConfirm({ type: 'delete', product: p })}>
                                                <Trash2Icon /> Delete
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {canDelete && !p.canDelete && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <p className='max-w-48 px-2 py-1.5 text-[11px] leading-snug text-muted-foreground'>Has orders — can’t be deleted. Deactivate it to hide it.</p>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )
            },
        }),
    ])

    return (
        <div className='pb-10'>
            <PageHeader
                title='Products'
                description={loading ? 'Loading your catalog…' : `${items.length} product${items.length === 1 ? '' : 's'} across ${categoryCount} categor${categoryCount === 1 ? 'y' : 'ies'}`}
                actions={canEdit && <Button className='h-10 cursor-pointer' onClick={() => navigate('/dashboard/products/new')}><PlusIcon /> Add product</Button>}
            />

            {!loading && items.length === 0 ? (
                <Empty className='min-h-[50vh] rounded-2xl border border-dashed bg-card'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'><PackageIcon /></EmptyMedia>
                        <EmptyTitle>Add your first product</EmptyTitle>
                        <EmptyDescription>List what you sell — with photos, price, stock and variants like size or color.</EmptyDescription>
                    </EmptyHeader>
                    {canEdit && <EmptyContent><Button onClick={() => navigate('/dashboard/products/new')} className='cursor-pointer'><PlusIcon /> Add product</Button></EmptyContent>}
                </Empty>
            ) : (
                <>
                    <div className='flex flex-col gap-3 lg:flex-row lg:items-center'>
                        <div className='relative w-full lg:max-w-xs'>
                            <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                            <Input placeholder='Search by name or SKU…' className='h-10 bg-white pl-9' value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className='flex flex-wrap gap-2 lg:ml-auto'>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className='h-10! min-w-44 bg-white'><SelectValue /></SelectTrigger>
                                <SelectContent position='popper'>
                                    <SelectItem value='ALL'>All categories</SelectItem>
                                    {meta?.categories.map(c => (
                                        <SelectGroup key={c.id}>
                                            <SelectLabel>{c.name}</SelectLabel>
                                            {c.children.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={stock} onValueChange={v => setStock(v as typeof stock)}>
                                <SelectTrigger className='h-10! min-w-40 bg-white'><SelectValue /></SelectTrigger>
                                <SelectContent position='popper'>
                                    <SelectItem value='ALL'>All stock statuses</SelectItem>
                                    <SelectItem value='IN'>In stock</SelectItem>
                                    <SelectItem value='LOW'>Low stock</SelectItem>
                                    <SelectItem value='OUT'>Out of stock</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={visibility} onValueChange={v => setVisibility(v as typeof visibility)}>
                                <SelectTrigger className='h-10! min-w-36 bg-white'><SelectValue /></SelectTrigger>
                                <SelectContent position='popper'>
                                    <SelectItem value='ALL'>All visibility</SelectItem>
                                    <SelectItem value='ACTIVE'>Active</SelectItem>
                                    <SelectItem value='INACTIVE'>Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                            {filtersOn && (
                                <Button variant='ghost' className='h-10 cursor-pointer' onClick={() => { setSearch(''); setCategory('ALL'); setStock('ALL'); setVisibility('ALL') }}>Clear</Button>
                            )}
                        </div>
                    </div>
                    <div className='mt-3'>
                        <DataTable columns={columns} data={filtered} isLoading={loading} />
                    </div>
                    {!loading && filtered.length === 0 && (
                        <p className='mt-3 text-center text-sm text-muted-foreground'>No products match these filters — try clearing your search or filters.</p>
                    )}
                </>
            )}

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={open => !open && setConfirm(null)}
                    title={confirm.type === 'delete' ? `Delete “${confirm.product.title}”?` : `${confirm.product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} “${confirm.product.title}”?`}
                    description={confirm.type === 'delete'
                        ? 'This permanently removes the product, its variants, images and stock history. This can’t be undone. To just hide it from customers, deactivate it instead.'
                        : confirm.product.status === 'ACTIVE'
                            ? 'Customers won’t see it on your page until you activate it again.'
                            : 'It will be visible to customers on your page again.'}
                    confirmLabel={confirm.type === 'delete' ? 'Delete product' : confirm.product.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    destructive={confirm.type === 'delete' || confirm.product.status === 'ACTIVE'}
                    loading={busy}
                    onConfirm={runConfirm}
                />
            )}
        </div>
    )
}
