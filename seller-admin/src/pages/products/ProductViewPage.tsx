import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { createColumnHelper } from '@tanstack/react-table'
import { ImageIcon, PackagePlusIcon, PencilIcon, PowerIcon, Trash2Icon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { useAppSelector } from '@/hooks/use-store'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { productsApi, type CatalogMeta, type ProductDetail, type ProductVariant } from '@/api/products'
import { inr, StockPill, VisibilityPill } from './_component/product-ui'
import StockAdjustDialog from './_component/StockAdjustDialog'
import StockLog from './_component/StockLog'
import { ProductViewSkeleton, type ProductPreview } from './_component/ProductSkeletons'

const vcol = createColumnHelper<DataTableFeatures, ProductVariant>()

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className='flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6'>
            <dt className='shrink-0 text-sm text-muted-foreground'>{label}</dt>
            <dd className='text-sm font-semibold break-words sm:text-right'>{children ?? <span className='font-normal text-muted-foreground'>—</span>}</dd>
        </div>
    )
}

function Section({ title, description, action, children }: { title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className='border-b'>
                <div className='flex items-start justify-between gap-3'>
                    <div>
                        <CardTitle className='text-base font-semibold'>{title}</CardTitle>
                        {description && <CardDescription className='mt-1'>{description}</CardDescription>}
                    </div>
                    {action}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

export default function ProductViewPage() {
    const { productId } = useParams<{ productId: string }>()
    const navigate = useNavigate()
    const preview = (useLocation().state as { preview?: ProductPreview } | null)?.preview ?? null
    const { can } = usePermission()
    const canEdit = can('SELLER_PRODUCTS', 'EDIT')
    const canDelete = can('SELLER_PRODUCTS', 'MANAGE')
    const sellerName = useAppSelector(s => s.auth.user?.seller?.name) ?? ''

    const [p, setP] = useState<ProductDetail | null>(null)
    const [meta, setMeta] = useState<CatalogMeta | null>(null)
    const [activeImage, setActiveImage] = useState(0)
    const [adjustOpen, setAdjustOpen] = useState(false)
    const [confirm, setConfirm] = useState<'status' | 'delete' | null>(null)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!productId) return
        Promise.all([productsApi.get(productId), productsApi.meta()])
            .then(([prod, m]) => { setP(prod.data); setMeta(m.data) })
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Product not found'))
                navigate('/dashboard/products', { replace: true })
            })
    }, [productId, navigate])

    if (!p || !meta) return <ProductViewSkeleton preview={preview} />

    const hasVariants = p.variants.length > 0
    const discount = p.compareAtPrice && p.compareAtPrice > p.sellingPrice ? Math.round(((p.compareAtPrice - p.sellingPrice) / p.compareAtPrice) * 100) : 0
    const label = (list: { value: string; label: string }[], v: string) => list.find(x => x.value === v)?.label ?? v

    const runConfirm = async () => {
        setBusy(true)
        try {
            if (confirm === 'delete') {
                toast.success((await productsApi.remove(p.id)).message)
                navigate('/dashboard/products', { replace: true })
                return
            }
            const res = await productsApi.setStatus(p.id, p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
            setP(res.data)
            toast.success(res.message ?? 'Updated')
            setConfirm(null)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Something went wrong'))
        } finally { setBusy(false) }
    }

    const variantColumns = vcol.columns([
        vcol.accessor('name', { header: 'Variant', cell: ({ row }) => <span className='font-medium'>{row.original.name}</span> }),
        vcol.accessor('price', {
            header: 'Price',
            cell: ({ row }) => (
                <span className='whitespace-nowrap'>
                    {inr(row.original.price)}
                    {row.original.compareAtPrice && <span className='ml-1.5 text-xs text-muted-foreground line-through'>{inr(row.original.compareAtPrice)}</span>}
                </span>
            ),
        }),
        vcol.accessor('inventoryQty', {
            header: 'Stock',
            cell: ({ row }) => <span className={cn('font-semibold tabular-nums', row.original.inventoryQty <= p.lowStockThreshold && 'text-destructive')}>{row.original.inventoryQty}</span>,
        }),
        vcol.accessor('sku', { header: 'SKU', cell: ({ row }) => <span className='font-mono text-xs'>{row.original.sku ?? '—'}</span> }),
    ])

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={p.title}
                description={`${p.category.parent ? `${p.category.parent.name} › ` : ''}${p.category.name} · updated ${moment(p.updatedAt).fromNow()}`}
                actions={canEdit && (
                    <>
                        {/* Delete only while the product has never been ordered */}
                        {canDelete && p.canDelete && <Button variant='ghost' className='h-10 cursor-pointer text-destructive' onClick={() => setConfirm('delete')}><Trash2Icon /> Delete</Button>}
                        <Button variant='outline' className='h-10 cursor-pointer' onClick={() => setConfirm('status')}>
                            <PowerIcon /> {p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button className='h-10 cursor-pointer' onClick={() => navigate(`/dashboard/products/${p.id}/edit`, { state: { preview: { title: p.title, imageUrl: p.images[0]?.url ?? null, status: p.status, stockStatus: p.stockStatus, category: { id: p.category.id, name: p.category.name, parentName: p.category.parent?.name ?? null } } } })}><PencilIcon /> Edit product</Button>
                    </>
                )}
            >
                <div className='flex flex-wrap items-center gap-2'>
                    {!p.canDelete && canDelete && (
                        <span className='order-last basis-full text-xs text-muted-foreground'>{p.deleteBlockedReason}</span>
                    )}
                    <VisibilityPill status={p.status} />
                    <StockPill status={p.stockStatus} />
                    {p.stockStatus === 'LOW' && <span className='text-xs font-semibold text-destructive'>{p.stock} left</span>}
                </div>
            </PageHeader>

            <div className='grid gap-6 lg:grid-cols-5'>
                {/* Left: media + customer preview */}
                <div className='grid h-fit gap-6 lg:col-span-2'>
                    <Card>
                        <CardContent>
                            <div className='relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-muted'>
                                {p.images[activeImage] ? <img src={p.images[activeImage].url} alt={p.title} className='size-full object-cover' /> : <ImageIcon className='size-12 text-muted-foreground/40' />}
                                {activeImage === 0 && p.images.length > 0 && <span className='absolute top-2 left-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground'>Primary</span>}
                            </div>
                            {p.images.length > 1 && (
                                <div className='mt-3 flex gap-2 overflow-x-auto'>
                                    {p.images.map((img, i) => (
                                        <button key={img.id} type='button' onClick={() => setActiveImage(i)} aria-label={`Image ${i + 1}`}
                                            className={cn('size-14 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2', i === activeImage ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100')}>
                                            <img src={img.url} alt='' className='size-full object-cover' />
                                        </button>
                                    ))}
                                </div>
                            )}
                            {p.images.length === 0 && <p className='mt-3 text-center text-xs text-muted-foreground'>No images yet — add some from Edit product › Media.</p>}
                        </CardContent>
                    </Card>

                    <Section title='How this looks to customers'>
                        <div className='flex gap-3 rounded-xl border bg-white p-3'>
                            <div className='flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted'>
                                {p.images[0] ? <img src={p.images[0].url} alt='' className='size-full object-cover' /> : <ImageIcon className='size-6 text-muted-foreground/50' />}
                            </div>
                            <div className='min-w-0'>
                                <div className='text-[11px] font-semibold text-primary'>{sellerName}</div>
                                <div className='line-clamp-2 text-sm font-semibold'>{p.title}</div>
                                <div className='mt-1 flex flex-wrap items-center gap-2'>
                                    <span className='font-bold'>{hasVariants ? `From ${inr(Math.min(...p.variants.map(v => v.price)))}` : inr(p.sellingPrice)}</span>
                                    {!hasVariants && discount > 0 && <><span className='text-xs text-muted-foreground line-through'>{inr(p.compareAtPrice)}</span><span className='rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary'>{discount}% off</span></>}
                                </div>
                            </div>
                        </div>
                    </Section>
                </div>

                {/* Right: details */}
                <div className='grid h-fit gap-6 lg:col-span-3'>
                    <Section title='Details'>
                        <dl>
                            <Row label='Description'><span className='block text-left font-normal whitespace-pre-line sm:max-w-md'>{p.description}</span></Row>
                            <Row label='Category'>{p.category.parent ? `${p.category.parent.name} › ` : ''}{p.category.name}</Row>
                            <Row label='Brand'>{p.brand?.name ?? <span className='font-normal text-muted-foreground'>No brand</span>}</Row>
                        </dl>
                    </Section>

                    <Section title='Pricing & variants'>
                        <dl>
                            <Row label='Selling price'>{inr(p.sellingPrice)}</Row>
                            <Row label='Compare-at price'>{p.compareAtPrice ? <>{inr(p.compareAtPrice)} <span className='font-normal text-muted-foreground'>(shown struck through)</span></> : null}</Row>
                            <Row label='Cost per item'>{p.costPerItem != null ? inr(p.costPerItem) : null}</Row>
                            {p.margin && <Row label='Margin'>{inr(p.margin.perUnit)} per unit · {p.margin.percent}%</Row>}
                            <Row label='Tax class'>{p.taxClass.gstRatePercent}% — {p.taxClass.description} <span className='font-normal text-muted-foreground'>(HSN {p.taxClass.hsnCode})</span></Row>
                        </dl>
                        {hasVariants && <div className='mt-4'><DataTable columns={variantColumns} data={p.variants} pageSize={50} /></div>}
                    </Section>

                    <Section title='Inventory' action={canEdit && <Button variant='outline' size='sm' className='cursor-pointer' onClick={() => setAdjustOpen(true)}><PackagePlusIcon /> Adjust stock</Button>}>
                        <dl>
                            {!hasVariants && <Row label='SKU'><span className='font-mono'>{p.sku}</span></Row>}
                            <Row label='Stock on hand'><span className={cn(p.stockStatus !== 'IN' && 'text-destructive')}>{p.stock}{hasVariants && <span className='font-normal text-muted-foreground'> across {p.variants.length} variants</span>}</span></Row>
                            <Row label='Low-stock threshold'>{p.lowStockThreshold}</Row>
                        </dl>
                        <div className='mt-4 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>Stock adjustment log</div>
                        <StockLog adjustments={p.adjustments} reasons={meta.adjustmentReasons} />
                    </Section>

                    <Section title='Shipping'>
                        <dl>
                            <Row label='Weight'>{p.weightKg != null ? `${p.weightKg} kg` : null}</Row>
                            <Row label='Package type'>{label(meta.packageTypes, p.packageType)}</Row>
                            <Row label='Cold chain'>{p.requiresColdChain ? 'Yes' : 'No'}</Row>
                            <Row label='Delivery'>{label(meta.deliveryScopes, p.deliveryScope)}</Row>
                            {p.deliveryScope === 'SPECIFIC_PINCODES' && <Row label='Extra pincodes'><span className='font-mono text-xs'>{p.deliveryPincodes.join(', ')}</span></Row>}
                        </dl>
                    </Section>

                    <Section title='SEO'>
                        <dl>
                            <Row label='Page title'>{p.seoTitle || p.title}</Row>
                            <Row label='Meta description'>{p.seoDescription}</Row>
                            <Row label='URL handle'><span className='font-mono text-xs'>/products/{p.slug}</span></Row>
                        </dl>
                    </Section>
                </div>
            </div>

            <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} product={p} reasons={meta.adjustmentReasons} onSaved={setP} />

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={o => !o && setConfirm(null)}
                    title={confirm === 'delete' ? `Delete “${p.title}”?` : `${p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} “${p.title}”?`}
                    description={confirm === 'delete'
                        ? 'This permanently removes the product, its variants, images and stock history. This can’t be undone. To just hide it, deactivate it instead.'
                        : p.status === 'ACTIVE' ? 'Customers won’t see it until you activate it again.' : 'It will be visible to customers again.'}
                    confirmLabel={confirm === 'delete' ? 'Delete product' : p.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    destructive={confirm === 'delete' || p.status === 'ACTIVE'}
                    loading={busy}
                    onConfirm={runConfirm}
                />
            )}
        </div>
    )
}
