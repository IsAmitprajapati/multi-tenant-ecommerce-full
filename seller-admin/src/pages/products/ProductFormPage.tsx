import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import {
    AlertCircleIcon, CheckIcon, CircleCheckIcon, CircleXIcon, ImageIcon, InfoIcon, Loader2Icon, PackagePlusIcon, PlusIcon, Trash2Icon, TruckIcon, XIcon,
} from 'lucide-react'
import PageHeader, { scrollPageToTop } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { useAppSelector } from '@/hooks/use-store'
import {
    productsApi, type CatalogMeta, type DeliveryScope, type PackageType, type ProductDetail, type ProductPayload, type ProductStatus,
} from '@/api/products'
import { inr, ProductImagesUploader, type GalleryImage } from './_component/product-ui'
import StockAdjustDialog from './_component/StockAdjustDialog'
import StockLog from './_component/StockLog'
import { ProductFormSkeleton, type ProductPreview } from './_component/ProductSkeletons'

const TABS = [
    { id: 'media', label: 'Media' },
    { id: 'details', label: 'Details' },
    { id: 'pricing', label: 'Pricing & variants' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'seo', label: 'SEO' },
    { id: 'shipping', label: 'Shipping' },
] as const
type TabId = (typeof TABS)[number]['id']

interface VariantRow { key: string; id?: string; name: string; price: string; compareAtPrice: string; sku: string; inventoryQty: string; currentQty?: number }

interface Form {
    title: string; description: string; categoryId: string; brandName: string
    slug: string; seoTitle: string; seoDescription: string; status: ProductStatus
    sellingPrice: string; compareAtPrice: string; costPerItem: string; taxClassId: string
    sku: string; inventoryQty: string; lowStockThreshold: string
    weightKg: string; packageType: PackageType; requiresColdChain: boolean; deliveryScope: DeliveryScope; deliveryPincodes: string[]
    images: GalleryImage[]; variants: VariantRow[]
}

const EMPTY: Form = {
    title: '', description: '', categoryId: '', brandName: '', slug: '', seoTitle: '', seoDescription: '', status: 'ACTIVE',
    sellingPrice: '', compareAtPrice: '', costPerItem: '', taxClassId: '', sku: '', inventoryQty: '0', lowStockThreshold: '5',
    weightKg: '', packageType: 'STANDARD_BAG', requiresColdChain: false, deliveryScope: 'SELLER_PINCODE_ONLY', deliveryPincodes: [],
    images: [], variants: [],
}

/** Which tab each field lives on — validation jumps to the first tab with an error */
const FIELD_TAB: Record<string, TabId> = {
    images: 'media', title: 'details', description: 'details', categoryId: 'details', brandName: 'details',
    sellingPrice: 'pricing', compareAtPrice: 'pricing', costPerItem: 'pricing', taxClassId: 'pricing', variants: 'pricing',
    sku: 'inventory', inventoryQty: 'inventory', lowStockThreshold: 'inventory',
    slug: 'seo', seoTitle: 'seo', seoDescription: 'seo',
    weightKg: 'shipping', deliveryPincodes: 'shipping',
}

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const slugify = (v: string) => v.toLowerCase().normalize('NFKD').replace(/&/g, 'and').replace(/[^\w\s-]/g, '').trim()
    .replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 110)
const money = (v: string) => (v.trim() === '' ? null : Number(v))
const newKey = () => Math.random().toString(36).slice(2)

function Field({ label, htmlFor, error, hint, className, children }: {
    label: React.ReactNode; htmlFor?: string; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode
}) {
    return (
        <div className={cn('grid min-w-0 content-start gap-1.5', className)}>
            <Label htmlFor={htmlFor} className='text-xs font-semibold text-muted-foreground'>{label}</Label>
            {children}
            {error ? <p className='text-xs text-destructive'>{error}</p> : hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
        </div>
    )
}

function MoneyInput({ id, value, onChange, invalid, disabled, placeholder }: { id?: string; value: string; onChange: (v: string) => void; invalid?: boolean; disabled?: boolean; placeholder?: string }) {
    return (
        <div className='relative'>
            <span className='pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground'>₹</span>
            <Input id={id} type='number' min={0} step='0.01' inputMode='decimal' className='h-10 pl-7' value={value} placeholder={placeholder ?? '0.00'}
                aria-invalid={invalid} disabled={disabled} onChange={e => onChange(e.target.value)} />
        </div>
    )
}

export default function ProductFormPage() {
    const { productId } = useParams<{ productId: string }>()
    const navigate = useNavigate()
    const preview = (useLocation().state as { preview?: ProductPreview } | null)?.preview ?? null
    const sellerName = useAppSelector(s => s.auth.user?.seller?.name) ?? 'Your seller page'
    const isEdit = Boolean(productId)

    const [meta, setMeta] = useState<CatalogMeta | null>(null)
    const [product, setProduct] = useState<ProductDetail | null>(null)
    const [form, setForm] = useState<Form>(EMPTY)
    const [tab, setTab] = useState<TabId>('media')
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const [slugTouched, setSlugTouched] = useState(false)
    const [slugState, setSlugState] = useState<{ checking: boolean; available: boolean | null; reason: string | null }>({ checking: false, available: null, reason: null })
    const [pincodeDraft, setPincodeDraft] = useState('')
    const [adjustOpen, setAdjustOpen] = useState(false)

    useEffect(() => {
        Promise.all([productsApi.meta(), productId ? productsApi.get(productId) : Promise.resolve(null)])
            .then(([m, p]) => {
                setMeta(m.data)
                if (p) { setProduct(p.data); setForm(toForm(p.data)); setSlugTouched(true) }
                else setForm(f => ({ ...f, taxClassId: m.data.taxClasses.find(t => t.hsnCode === '9999')?.id ?? m.data.taxClasses[0]?.id ?? '' }))
            })
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Could not load the product'))
                navigate('/dashboard/products', { replace: true })
            })
    }, [productId, navigate])

    // Debounced URL-handle uniqueness check (per seller)
    const slugReq = useRef(0)
    useEffect(() => {
        const slug = form.slug
        if (!slug || !SLUG.test(slug) || (product && slug === product.slug)) { setSlugState({ checking: false, available: product && slug === product.slug ? true : null, reason: null }); return }
        const id = ++slugReq.current
        setSlugState(s => ({ ...s, checking: true }))
        const t = setTimeout(() => {
            productsApi.slugAvailability(slug, productId)
                .then(r => id === slugReq.current && setSlugState({ checking: false, available: r.data.available, reason: r.data.reason }))
                .catch(() => id === slugReq.current && setSlugState({ checking: false, available: null, reason: null }))
        }, 400)
        return () => clearTimeout(t)
    }, [form.slug, product, productId])

    const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k as string]: '' })) }
    const setVariant = (key: string, patch: Partial<VariantRow>) => { setForm(f => ({ ...f, variants: f.variants.map(v => (v.key === key ? { ...v, ...patch } : v)) })); setErrors(e => ({ ...e, variants: '' })) }

    const category = useMemo(() => meta?.categories.find(c => c.children.some(ch => ch.id === form.categoryId)), [meta, form.categoryId])
    const taxClass = meta?.taxClasses.find(t => t.id === form.taxClassId)
    const hasVariants = form.variants.length > 0
    const price = money(form.sellingPrice) ?? 0
    const compareAt = money(form.compareAtPrice)
    const cost = money(form.costPerItem)
    const discount = compareAt && compareAt > price && price > 0 ? Math.round(((compareAt - price) / compareAt) * 100) : 0
    const margin = cost != null && price > 0 ? { perUnit: price - cost, percent: Math.round(((price - cost) / price) * 100) } : null

    /* ----------------------------- Validation ----------------------------- */
    const validate = () => {
        const e: Record<string, string> = {}
        if (form.title.trim().length < 2) e.title = 'Enter a product name'
        if (!form.categoryId) e.categoryId = 'Choose a category'
        if (!(price > 0)) e.sellingPrice = 'Enter a selling price'
        if (compareAt != null && compareAt > 0 && compareAt <= price) e.compareAtPrice = 'Must be higher than the selling price'
        if (!form.taxClassId) e.taxClassId = 'Choose a tax class'
        if (hasVariants) {
            const bad = form.variants.find(v => !v.name.trim() || !(Number(v.price) > 0))
            if (bad) e.variants = 'Every variant needs a name and a price'
            const names = form.variants.map(v => v.name.trim().toLowerCase())
            if (!e.variants && names.some((n, i) => names.indexOf(n) !== i)) e.variants = 'Variant names must be different'
            const badCmp = form.variants.find(v => v.compareAtPrice && Number(v.compareAtPrice) <= Number(v.price))
            if (!e.variants && badCmp) e.variants = `“${badCmp.name}”: compare-at must be higher than its price`
        } else if (!isEdit && (!Number.isInteger(Number(form.inventoryQty)) || Number(form.inventoryQty) < 0)) e.inventoryQty = 'Enter a whole number (0 or more)'
        if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) e.lowStockThreshold = 'Enter a whole number'
        if (form.slug && !SLUG.test(form.slug)) e.slug = 'Use lowercase letters, numbers and hyphens'
        else if (slugState.available === false) e.slug = slugState.reason ?? 'Already used'
        if (form.weightKg && !(Number(form.weightKg) >= 0)) e.weightKg = 'Enter a weight in kg'
        if (form.deliveryScope === 'SPECIFIC_PINCODES' && form.deliveryPincodes.length === 0) e.deliveryPincodes = 'Add at least one pincode'
        setErrors(e)
        const first = Object.keys(e)[0]
        if (first) { setTab(FIELD_TAB[first] ?? 'details'); scrollPageToTop(); return false }
        return true
    }

    const payload = (): ProductPayload => ({
        title: form.title.trim(),
        description: form.description.trim(),
        categoryId: form.categoryId,
        brandName: form.brandName.trim(),
        ...(form.slug && { slug: form.slug }),
        seoTitle: form.seoTitle.trim(),
        seoDescription: form.seoDescription.trim(),
        status: form.status,
        sellingPrice: price,
        compareAtPrice: compareAt,
        costPerItem: cost,
        taxClassId: form.taxClassId,
        sku: hasVariants ? '' : form.sku.trim(),
        ...(!isEdit && !hasVariants && { inventoryQty: Number(form.inventoryQty) || 0 }),
        lowStockThreshold: Number(form.lowStockThreshold) || 0,
        weightKg: money(form.weightKg),
        packageType: form.packageType,
        requiresColdChain: form.requiresColdChain,
        deliveryScope: form.deliveryScope,
        deliveryPincodes: form.deliveryScope === 'SPECIFIC_PINCODES' ? form.deliveryPincodes : [],
        variants: form.variants.map(v => ({
            ...(v.id && { id: v.id }),
            name: v.name.trim(),
            price: Number(v.price),
            ...(v.compareAtPrice && { compareAtPrice: Number(v.compareAtPrice) }),
            ...(v.sku.trim() && { sku: v.sku.trim() }),
            ...(!v.id && { inventoryQty: Number(v.inventoryQty) || 0 }),
        })),
        images: form.images.map(i => ({ fileId: i.fileId })),
    })

    const save = async () => {
        if (!validate()) return
        setSaving(true)
        try {
            const res = product ? await productsApi.update(product.id, payload()) : await productsApi.create(payload())
            toast.success(res.message ?? 'Product saved')
            // a new brand may have been created — refresh the cached options in the background
            if (form.brandName.trim() && !meta?.brands.some(b => b.name === form.brandName.trim())) productsApi.meta(true).catch(() => undefined)
            navigate(`/dashboard/products/${res.data.id}`)
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Could not save the product')
            const field = isAxiosError<{ field?: string }>(err) ? err.response?.data?.field : undefined
            if (field) { setErrors({ [field]: message }); setTab(FIELD_TAB[field] ?? tab) }
            toast.error(message)
        } finally { setSaving(false) }
    }

    if (!meta || (isEdit && !product)) return <ProductFormSkeleton preview={preview} isEdit={isEdit} />

    const tabHasError = (t: TabId) => Object.entries(errors).some(([k, v]) => v && FIELD_TAB[k] === t)
    const addPincode = () => {
        const codes = pincodeDraft.split(/[\s,]+/).map(s => s.trim()).filter(Boolean)
        const bad = codes.find(c => !/^[1-9]\d{5}$/.test(c))
        if (bad) { setErrors(e => ({ ...e, deliveryPincodes: `“${bad}” isn’t a valid 6-digit pincode` })); return }
        set('deliveryPincodes', [...new Set([...form.deliveryPincodes, ...codes])])
        setPincodeDraft('')
    }

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={isEdit ? (product?.title ?? 'Edit product') : 'Add product'}
                description={isEdit ? 'Update photos, details, pricing, stock and delivery.' : 'Fill in each tab, then save. Only the name, category, price and tax class are required.'}
                actions={(
                    <>
                        <label className='mr-1 flex cursor-pointer items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium'>
                            <Switch checked={form.status === 'ACTIVE'} onCheckedChange={v => set('status', v ? 'ACTIVE' : 'INACTIVE')} />
                            {form.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </label>
                        <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(product ? `/dashboard/products/${product.id}` : '/dashboard/products')} disabled={saving}>Discard</Button>
                        <Button className='h-10 min-w-32 cursor-pointer' onClick={save} disabled={saving}>{saving && <Spinner />} Save product</Button>
                    </>
                )}
            >
                <nav className='flex gap-1 overflow-x-auto rounded-lg bg-muted p-1' aria-label='Product sections'>
                    {TABS.map(t => (
                        <button key={t.id} type='button' onClick={() => setTab(t.id)} aria-current={tab === t.id ? 'page' : undefined}
                            className={cn('relative shrink-0 cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors',
                                tab === t.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                            {t.label}
                            {tabHasError(t.id) && <span className='absolute top-1 right-1 size-1.5 rounded-full bg-destructive' aria-label='has errors' />}
                        </button>
                    ))}
                </nav>
            </PageHeader>

            {Object.values(errors).some(Boolean) && (
                <div className='mb-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm text-destructive'>
                    <AlertCircleIcon className='size-4 shrink-0' /> Fix the highlighted fields — tabs with a red dot need attention.
                </div>
            )}

            {/* ------------------------------ Media ------------------------------ */}
            {tab === 'media' && (
                <Card>
                    <CardHeader className='border-b'>
                        <CardTitle className='flex items-center gap-2 text-base font-semibold'><ImageIcon className='size-4 text-primary' /> Media</CardTitle>
                        <CardDescription>Clear photos on a plain background sell best. Square images look best on the marketplace.</CardDescription>
                    </CardHeader>
                    <CardContent><ProductImagesUploader images={form.images} onChange={imgs => set('images', imgs)} disabled={saving} /></CardContent>
                </Card>
            )}

            {/* ----------------------------- Details ----------------------------- */}
            {tab === 'details' && (
                <Card>
                    <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>Product details</CardTitle></CardHeader>
                    <CardContent className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>
                        <Field label='Product name' htmlFor='title' error={errors.title} className='sm:col-span-2'>
                            <Input id='title' className='h-10' placeholder='Organic bananas (1kg)' maxLength={150} value={form.title} aria-invalid={!!errors.title}
                                onChange={e => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)) }} />
                        </Field>
                        <Field label='Description' htmlFor='description' className='sm:col-span-2' hint={`${form.description.length}/5000`}>
                            <Textarea id='description' rows={6} maxLength={5000} placeholder='What is it, what makes it good, size/weight, care instructions…'
                                value={form.description} onChange={e => set('description', e.target.value)} />
                        </Field>
                        <Field label='Category' error={errors.categoryId} hint={category?.requiresFssai ? 'Food item — your FSSAI license covers this listing' : undefined}>
                            <Select value={form.categoryId} onValueChange={v => set('categoryId', v)}>
                                <SelectTrigger className='h-10! w-full' aria-invalid={!!errors.categoryId}><SelectValue placeholder='Choose a category' /></SelectTrigger>
                                <SelectContent position='popper' className='max-h-80'>
                                    {meta.categories.map(c => (
                                        <SelectGroup key={c.id}>
                                            <SelectLabel>{c.name}</SelectLabel>
                                            {c.children.map(ch => <SelectItem key={ch.id} value={ch.id}>{ch.name}</SelectItem>)}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label='Brand' htmlFor='brand' hint='Leave empty for “No brand”. New brand names are saved for next time.'>
                            <Input id='brand' className='h-10' list='brand-options' placeholder='No brand' maxLength={80} value={form.brandName} onChange={e => set('brandName', e.target.value)} />
                            <datalist id='brand-options'>{meta.brands.map(b => <option key={b.id} value={b.name} />)}</datalist>
                        </Field>
                    </CardContent>
                </Card>
            )}

            {/* ------------------------- Pricing & variants ------------------------- */}
            {tab === 'pricing' && (
                <div className='grid gap-6 lg:grid-cols-3'>
                    <div className='grid content-start gap-6 lg:col-span-2'>
                        <Card>
                            <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>Pricing</CardTitle></CardHeader>
                            <CardContent className='grid gap-x-4 gap-y-5 sm:grid-cols-3'>
                                <Field label='Selling price' htmlFor='price' error={errors.sellingPrice} hint={hasVariants ? 'Base price — each variant has its own' : undefined}>
                                    <MoneyInput id='price' value={form.sellingPrice} onChange={v => set('sellingPrice', v)} invalid={!!errors.sellingPrice} />
                                </Field>
                                <Field label='Compare-at price' htmlFor='compareAt' error={errors.compareAtPrice} hint='Shown struck through'>
                                    <MoneyInput id='compareAt' value={form.compareAtPrice} onChange={v => set('compareAtPrice', v)} invalid={!!errors.compareAtPrice} placeholder='Optional' />
                                </Field>
                                <Field label='Cost per item' htmlFor='cost' hint='Not shown to customers'>
                                    <MoneyInput id='cost' value={form.costPerItem} onChange={v => set('costPerItem', v)} placeholder='Optional' />
                                </Field>
                                <Field label='Tax class' error={errors.taxClassId} className='sm:col-span-2'>
                                    <Select value={form.taxClassId} onValueChange={v => set('taxClassId', v)}>
                                        <SelectTrigger className='h-10! w-full' aria-invalid={!!errors.taxClassId}><SelectValue placeholder='Choose a tax class' /></SelectTrigger>
                                        <SelectContent position='popper' className='max-h-80'>
                                            {meta.taxClasses.map(t => <SelectItem key={t.id} value={t.id}>{t.gstRatePercent}% — {t.description} (HSN {t.hsnCode})</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <div className='flex items-end'>
                                    {margin && (
                                        <p className={cn('rounded-lg px-3 py-2 text-xs font-medium', margin.perUnit >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive')}>
                                            Margin: {inr(margin.perUnit)} per unit · {margin.percent}%
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className='border-b'>
                                <div className='flex items-start justify-between gap-3'>
                                    <div>
                                        <CardTitle className='text-base font-semibold'>Variants</CardTitle>
                                        <CardDescription className='mt-1'>Sizes, weights or colors — each has its own price, stock and SKU.</CardDescription>
                                    </div>
                                    <Button type='button' variant='outline' size='sm' className='cursor-pointer'
                                        onClick={() => set('variants', [...form.variants, { key: newKey(), name: '', price: form.sellingPrice, compareAtPrice: '', sku: '', inventoryQty: '0' }])}>
                                        <PlusIcon /> Add variant
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {errors.variants && <p className='mb-3 text-xs text-destructive'>{errors.variants}</p>}
                                {!hasVariants ? (
                                    <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>
                                        No variants — this product is sold as a single item. Add variants for things like 500g / 1kg / 2kg.
                                    </p>
                                ) : (
                                    <div className='overflow-x-auto rounded-lg border'>
                                        <table className='w-full min-w-[640px] text-sm'>
                                            <thead className='bg-muted/50 text-left text-xs font-semibold text-muted-foreground'>
                                                <tr>
                                                    <th className='px-3 py-2'>Variant</th><th className='px-3 py-2'>Price</th><th className='px-3 py-2'>Compare-at</th>
                                                    <th className='px-3 py-2'>Stock</th><th className='px-3 py-2'>SKU</th><th className='w-10' />
                                                </tr>
                                            </thead>
                                            <tbody className='divide-y'>
                                                {form.variants.map(v => (
                                                    <tr key={v.key}>
                                                        <td className='p-2'><Input className='h-9' placeholder='e.g. 1kg' maxLength={80} value={v.name} onChange={e => setVariant(v.key, { name: e.target.value })} /></td>
                                                        <td className='w-32 p-2'><MoneyInput value={v.price} onChange={x => setVariant(v.key, { price: x })} /></td>
                                                        <td className='w-32 p-2'><MoneyInput value={v.compareAtPrice} onChange={x => setVariant(v.key, { compareAtPrice: x })} placeholder='—' /></td>
                                                        <td className='w-28 p-2'>
                                                            {v.id
                                                                ? <span className={cn('block px-2 text-sm font-semibold tabular-nums', (v.currentQty ?? 0) <= Number(form.lowStockThreshold) && 'text-destructive')} title='Change stock from the Inventory tab'>{v.currentQty}</span>
                                                                : <Input className='h-9' type='number' min={0} step={1} value={v.inventoryQty} onChange={e => setVariant(v.key, { inventoryQty: e.target.value })} aria-label='Opening stock' />}
                                                        </td>
                                                        <td className='w-40 p-2'><Input className='h-9' placeholder='Optional' maxLength={64} value={v.sku} onChange={e => setVariant(v.key, { sku: e.target.value })} /></td>
                                                        <td className='p-2'>
                                                            <Button type='button' variant='ghost' size='icon-sm' className='cursor-pointer text-muted-foreground hover:text-destructive' aria-label='Remove variant'
                                                                onClick={() => set('variants', form.variants.filter(x => x.key !== v.key))}><Trash2Icon /></Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                {isEdit && hasVariants && <p className='mt-2 text-xs text-muted-foreground'>Stock for existing variants is changed from the Inventory tab, so every change is logged.</p>}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Customer preview */}
                    <Card className='h-fit'>
                        <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>How this looks to customers</CardTitle></CardHeader>
                        <CardContent>
                            <div className='overflow-hidden rounded-xl border bg-white'>
                                <div className='flex aspect-square items-center justify-center bg-muted'>
                                    {form.images[0] ? <img src={form.images[0].url} alt='' className='size-full object-cover' /> : <ImageIcon className='size-10 text-muted-foreground/50' />}
                                </div>
                                <div className='p-3'>
                                    <div className='text-[11px] font-semibold text-primary'>{sellerName}</div>
                                    <div className='mt-0.5 line-clamp-2 text-sm font-semibold'>{form.title || 'Product name'}</div>
                                    <div className='mt-1.5 flex flex-wrap items-center gap-2'>
                                        <span className='font-bold'>{hasVariants ? `From ${inr(Math.min(...form.variants.map(v => Number(v.price) || 0)))}` : inr(price || null)}</span>
                                        {!hasVariants && discount > 0 && (
                                            <>
                                                <span className='text-xs text-muted-foreground line-through'>{inr(compareAt)}</span>
                                                <span className='rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary'>{discount}% off</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <p className='mt-3 text-xs text-muted-foreground'>The compare-at price shows struck through with a savings badge whenever it’s higher than the selling price.</p>
                            {taxClass && <p className='mt-2 text-xs text-muted-foreground'>Prices include {taxClass.gstRatePercent}% GST.</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ----------------------------- Inventory ----------------------------- */}
            {tab === 'inventory' && (
                <div className='grid gap-6 lg:grid-cols-5'>
                    <Card className='h-fit lg:col-span-2'>
                        <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>Inventory</CardTitle></CardHeader>
                        <CardContent className='grid gap-5'>
                            {!hasVariants && (
                                <Field label='SKU' htmlFor='sku' error={errors.sku} hint='Your own stock code — unique across your catalog'>
                                    <Input id='sku' className='h-10' placeholder='GG-FR-0042' maxLength={64} value={form.sku} aria-invalid={!!errors.sku} onChange={e => set('sku', e.target.value)} />
                                </Field>
                            )}
                            {hasVariants ? (
                                <p className='rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground'>Stock and SKU are set per variant in <button type='button' className='cursor-pointer font-semibold text-primary hover:underline' onClick={() => setTab('pricing')}>Pricing & variants</button>.</p>
                            ) : !isEdit ? (
                                <Field label='Opening stock' htmlFor='qty' error={errors.inventoryQty} hint='Later changes are made with “Adjust stock” and logged'>
                                    <Input id='qty' type='number' min={0} step={1} className='h-10' value={form.inventoryQty} aria-invalid={!!errors.inventoryQty} onChange={e => set('inventoryQty', e.target.value)} />
                                </Field>
                            ) : (
                                <div className='grid gap-1.5'>
                                    <span className='text-xs font-semibold text-muted-foreground'>Stock on hand</span>
                                    <div className='text-2xl font-bold tabular-nums'>{product?.inventoryQty}</div>
                                </div>
                            )}
                            <Field label='Low-stock threshold' htmlFor='low' error={errors.lowStockThreshold} hint='You’ll see a “Low stock” alert at or below this'>
                                <Input id='low' type='number' min={0} step={1} className='h-10' value={form.lowStockThreshold} aria-invalid={!!errors.lowStockThreshold} onChange={e => set('lowStockThreshold', e.target.value)} />
                            </Field>
                            {isEdit && product && (
                                <Button type='button' variant='outline' className='h-10 cursor-pointer' onClick={() => setAdjustOpen(true)}><PackagePlusIcon /> Adjust stock</Button>
                            )}
                        </CardContent>
                    </Card>
                    <Card className='h-fit lg:col-span-3'>
                        <CardHeader className='border-b'>
                            <CardTitle className='text-base font-semibold'>Stock adjustment log</CardTitle>
                            <CardDescription>Every stock change — restocks, damage, returns and corrections.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {product ? <StockLog adjustments={product.adjustments} reasons={meta.adjustmentReasons} />
                                : <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>The log starts once the product is saved.</p>}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* -------------------------------- SEO -------------------------------- */}
            {tab === 'seo' && (
                <div className='grid gap-6 lg:grid-cols-5'>
                    <Card className='h-fit lg:col-span-3'>
                        <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>Search engine listing</CardTitle></CardHeader>
                        <CardContent className='grid gap-5'>
                            <Field label='Page title' htmlFor='seoTitle' hint={`${(form.seoTitle || form.title).length}/70 — defaults to the product name`}>
                                <Input id='seoTitle' className='h-10' maxLength={70} placeholder={form.title || 'Organic Bananas 1kg — Fresh Daily'} value={form.seoTitle} onChange={e => set('seoTitle', e.target.value)} />
                            </Field>
                            <Field label='Meta description' htmlFor='seoDescription' hint={`${form.seoDescription.length}/170`}>
                                <Textarea id='seoDescription' rows={3} maxLength={170} placeholder='Buy fresh organic bananas online, delivered same-day.' value={form.seoDescription} onChange={e => set('seoDescription', e.target.value)} />
                            </Field>
                            <Field label='URL handle' htmlFor='slug' error={errors.slug}
                                hint={slugState.available === false ? <span className='text-destructive'>{slugState.reason}</span> : slugState.available && form.slug !== product?.slug ? <span className='text-primary'>Available</span> : 'Generated from the product name'}>
                                <div className={cn('flex h-10 items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50', errors.slug && 'border-destructive')}>
                                    <span className='shrink-0 pl-3 text-sm text-muted-foreground'>/products/</span>
                                    <input id='slug' className='h-full min-w-0 flex-1 bg-transparent pr-2 text-sm outline-none' placeholder='organic-bananas-1kg' value={form.slug}
                                        onChange={e => { setSlugTouched(true); set('slug', slugify(e.target.value)) }} />
                                    <span className='pr-3'>
                                        {slugState.checking ? <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
                                            : slugState.available === true ? <CircleCheckIcon className='size-4 text-primary' />
                                                : slugState.available === false ? <CircleXIcon className='size-4 text-destructive' /> : null}
                                    </span>
                                </div>
                            </Field>
                        </CardContent>
                    </Card>
                    <Card className='h-fit lg:col-span-2'>
                        <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>Preview</CardTitle></CardHeader>
                        <CardContent>
                            <div className='rounded-lg border bg-white p-4'>
                                <div className='truncate text-xs text-muted-foreground'>marketplace › products › {form.slug || 'product-url'}</div>
                                <div className='mt-1 line-clamp-1 text-base font-medium text-[#1a0dab]'>{form.seoTitle || form.title || 'Product page title'}{form.title ? ` | ${sellerName}` : ''}</div>
                                <div className='mt-1 line-clamp-2 text-xs text-muted-foreground'>{form.seoDescription || form.description || 'A short description that appears in search results.'}</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ------------------------------ Shipping ------------------------------ */}
            {tab === 'shipping' && (
                <div className='grid gap-6 lg:grid-cols-5'>
                    <Card className='h-fit lg:col-span-2'>
                        <CardHeader className='border-b'><CardTitle className='text-base font-semibold'>Package</CardTitle></CardHeader>
                        <CardContent className='grid gap-5'>
                            <Field label='Weight (kg)' htmlFor='weight' error={errors.weightKg} hint='Packed weight — used for delivery charges'>
                                <Input id='weight' type='number' min={0} step='0.001' className='h-10' placeholder='1.0' value={form.weightKg} aria-invalid={!!errors.weightKg} onChange={e => set('weightKg', e.target.value)} />
                            </Field>
                            <Field label='Package type'>
                                <Select value={form.packageType} onValueChange={v => set('packageType', v as PackageType)}>
                                    <SelectTrigger className='h-10! w-full'><SelectValue /></SelectTrigger>
                                    <SelectContent position='popper'>{meta.packageTypes.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                                </Select>
                            </Field>
                            <div className='grid gap-1.5'>
                                <span className='text-xs font-semibold text-muted-foreground'>Requires cold chain</span>
                                <div className='inline-flex w-fit gap-1 rounded-lg bg-muted p-1' role='radiogroup' aria-label='Requires cold chain'>
                                    {[false, true].map(v => (
                                        <button key={String(v)} type='button' role='radio' aria-checked={form.requiresColdChain === v} onClick={() => set('requiresColdChain', v)}
                                            className={cn('cursor-pointer rounded-md px-5 py-1.5 text-sm font-semibold', form.requiresColdChain === v ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground')}>
                                            {v ? 'Yes' : 'No'}
                                        </button>
                                    ))}
                                </div>
                                <span className='text-xs text-muted-foreground'>Chilled or frozen items are delivered in insulated bags.</span>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className='h-fit lg:col-span-3'>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><TruckIcon className='size-4 text-primary' /> Delivery availability</CardTitle>
                        </CardHeader>
                        <CardContent className='grid gap-3'>
                            <div role='radiogroup' aria-label='Delivery availability' className='grid gap-2'>
                                {meta.deliveryScopes.map(o => {
                                    const selected = form.deliveryScope === o.value
                                    return (
                                        <button key={o.value} type='button' role='radio' aria-checked={selected} onClick={() => set('deliveryScope', o.value)}
                                            className={cn('flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors', selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/50')}>
                                            <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', selected ? 'border-primary' : 'border-input')}>
                                                {selected && <span className='size-2 rounded-full bg-primary' />}
                                            </span>
                                            <span><span className='block text-sm font-semibold'>{o.label}</span><span className='block text-xs text-muted-foreground'>{o.description}</span></span>
                                        </button>
                                    )
                                })}
                            </div>
                            {form.deliveryScope === 'SPECIFIC_PINCODES' && (
                                <div className='grid gap-2 rounded-lg border bg-muted/20 p-3'>
                                    <div className='flex gap-2'>
                                        <Input className='h-10' placeholder='Add pincodes, e.g. 560034, 560095' value={pincodeDraft} inputMode='numeric' aria-invalid={!!errors.deliveryPincodes}
                                            onChange={e => { setPincodeDraft(e.target.value); setErrors(er => ({ ...er, deliveryPincodes: '' })) }}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPincode() } }} />
                                        <Button type='button' variant='outline' className='h-10 cursor-pointer' onClick={addPincode}><PlusIcon /> Add</Button>
                                    </div>
                                    {errors.deliveryPincodes && <p className='text-xs text-destructive'>{errors.deliveryPincodes}</p>}
                                    <div className='flex flex-wrap gap-2'>
                                        {form.deliveryPincodes.map(p => (
                                            <span key={p} className='inline-flex items-center gap-1 rounded-full border bg-white py-0.5 pr-1 pl-2.5 font-mono text-xs'>
                                                {p}
                                                <button type='button' aria-label={`Remove ${p}`} className='cursor-pointer rounded-full p-0.5 hover:bg-muted' onClick={() => set('deliveryPincodes', form.deliveryPincodes.filter(x => x !== p))}><XIcon className='size-3' /></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {form.deliveryScope === 'PAN_INDIA' && (
                                <p className='flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground'>
                                    <InfoIcon className='mt-0.5 size-3.5 shrink-0' /> This product ships anywhere in India via courier. Pan-India items are fulfilled through shipping & tracking, not local delivery-agent assignment.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <div className='mt-6 flex items-center justify-between gap-2'>
                <span className='hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex'><CheckIcon className='size-3.5' /> Changes are saved when you click Save product.</span>
                <div className='ml-auto flex gap-2'>
                    <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(product ? `/dashboard/products/${product.id}` : '/dashboard/products')} disabled={saving}>Discard</Button>
                    <Button className='h-10 min-w-32 cursor-pointer' onClick={save} disabled={saving}>{saving && <Spinner />} Save product</Button>
                </div>
            </div>

            {product && (
                <StockAdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} product={product} reasons={meta.adjustmentReasons}
                    onSaved={p => {
                        setProduct(p)
                        // reflect new stock in the variants table without losing unsaved edits
                        setForm(f => ({ ...f, variants: f.variants.map(v => (v.id ? { ...v, currentQty: p.variants.find(x => x.id === v.id)?.inventoryQty ?? v.currentQty } : v)) }))
                    }} />
            )}
        </div>
    )
}

function toForm(p: ProductDetail): Form {
    const s = (n: number | null) => (n == null ? '' : String(n))
    return {
        title: p.title, description: p.description ?? '', categoryId: p.category.id, brandName: p.brand?.name ?? '',
        slug: p.slug, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', status: p.status,
        sellingPrice: s(p.sellingPrice), compareAtPrice: s(p.compareAtPrice), costPerItem: s(p.costPerItem), taxClassId: p.taxClass.id,
        sku: p.sku ?? '', inventoryQty: String(p.inventoryQty), lowStockThreshold: String(p.lowStockThreshold),
        weightKg: s(p.weightKg), packageType: p.packageType, requiresColdChain: p.requiresColdChain, deliveryScope: p.deliveryScope, deliveryPincodes: p.deliveryPincodes,
        images: p.images.map(i => ({ fileId: i.fileId, url: i.url })),
        variants: p.variants.map(v => ({ key: v.id, id: v.id, name: v.name, price: String(v.price), compareAtPrice: s(v.compareAtPrice), sku: v.sku ?? '', inventoryQty: '0', currentQty: v.inventoryQty })),
    }
}
