import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PackageIcon, PlusIcon, SearchIcon, XIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import {
    PROMO_THEMES, SOURCE_LABELS, storefrontApi, type PromoCard, type PromoTheme, type CategoryOption, type HomeSection, type ProductCard, type ProductSource, type SectionType,
} from '@/api/storefront'

export interface SectionDraft {
    type: SectionType
    title: string
    source?: ProductSource
}

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

function ProductThumb({ p }: { p: ProductCard }) {
    return p.imageUrl
        ? <img src={p.imageUrl} alt='' className='size-10 shrink-0 rounded-md border object-cover' />
        : <span className='flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted'><PackageIcon className='size-4 text-muted-foreground' /></span>
}

/** Search every seller's live products and build an ordered list */
function ProductPicker({ value, onChange }: { value: ProductCard[]; onChange: (v: ProductCard[]) => void }) {
    const [q, setQ] = useState('')
    const [results, setResults] = useState<ProductCard[] | null>(null)

    useEffect(() => {
        const t = setTimeout(() => {
            storefrontApi.pickProducts(q).then(setResults).catch(() => setResults([]))
        }, 250)
        return () => clearTimeout(t)
    }, [q])

    const picked = new Set(value.map(p => p.id))
    const move = (i: number, d: -1 | 1) => {
        const next = [...value]
        ;[next[i], next[i + d]] = [next[i + d], next[i]]
        onChange(next)
    }

    return (
        <div className='grid gap-3 sm:grid-cols-2'>
            <div className='grid min-w-0 content-start gap-2'>
                <div className='relative'>
                    <SearchIcon className='absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input className='h-9 pl-8' placeholder='Search products, SKU or seller' value={q} onChange={e => setQ(e.target.value)} />
                </div>
                <div className='h-64 overflow-y-auto rounded-lg border'>
                    {results === null
                        ? <div className='grid gap-2 p-2'>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-12' />)}</div>
                        : results.length === 0
                            ? <p className='p-4 text-center text-xs text-muted-foreground'>No live products match.</p>
                            : results.map(p => {
                                const on = picked.has(p.id)
                                return (
                                    <button key={p.id} type='button' disabled={on || value.length >= 40}
                                        onClick={() => onChange([...value, p])}
                                        className='flex w-full cursor-pointer items-center gap-2 border-b px-2 py-1.5 text-left last:border-0 hover:bg-muted/60 disabled:cursor-default disabled:opacity-60'>
                                        <ProductThumb p={p} />
                                        <span className='min-w-0 flex-1'>
                                            <span className='block truncate text-sm font-medium'>{p.title}</span>
                                            <span className='block truncate text-xs text-muted-foreground'>{p.seller.name} · {inr(p.price)}</span>
                                        </span>
                                        {on ? <CheckIcon className='size-4 text-primary' /> : <PlusIcon className='size-4 text-muted-foreground' />}
                                    </button>
                                )
                            })}
                </div>
            </div>
            <div className='grid min-w-0 content-start gap-2'>
                <div className='flex h-9 items-center text-xs font-semibold text-muted-foreground'>Picked ({value.length}) — shown in this order</div>
                <div className='h-64 overflow-y-auto rounded-lg border'>
                    {value.length === 0
                        ? <p className='p-4 text-center text-xs text-muted-foreground'>Pick products from the list.</p>
                        : value.map((p, i) => (
                            <div key={p.id} className='flex items-center gap-2 border-b px-2 py-1.5 last:border-0'>
                                <span className='w-4 text-xs text-muted-foreground tabular-nums'>{i + 1}</span>
                                <ProductThumb p={p} />
                                <span className='min-w-0 flex-1 truncate text-sm'>{p.title}</span>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' disabled={i === 0} onClick={() => move(i, -1)} aria-label='Move up'><ArrowUpIcon /></Button>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label='Move down'><ArrowDownIcon /></Button>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' onClick={() => onChange(value.filter(x => x.id !== p.id))} aria-label={`Remove ${p.title}`}><XIcon /></Button>
                            </div>
                        ))}
                </div>
            </div>
        </div>
    )
}

const LINK_RE = /^(\/\S*|https?:\/\/\S+)$/

const DEFAULT_CARDS: PromoCard[] = [
    { tag: 'New', title: 'Organic essentials', linkUrl: '/category/grocery', theme: 'DARK' },
    { tag: 'Trending', title: 'Monsoon snack box', linkUrl: '/category/grocery-snacks', theme: 'SAND' },
    { tag: 'Limited', title: 'Festive gift hampers', linkUrl: '/products?sort=deals', theme: 'MINT' },
]

/** 1–6 colour tiles; each has a small tag, a title, a link and a colour */
function PromoCardsEditor({ value, onChange, errors }: { value: PromoCard[]; onChange: (v: PromoCard[]) => void; errors: Record<number, string> }) {
    const update = (i: number, patch: Partial<PromoCard>) => onChange(value.map((c, j) => j === i ? { ...c, ...patch } : c))
    const move = (i: number, d: -1 | 1) => {
        const next = [...value]
        ;[next[i], next[i + d]] = [next[i + d], next[i]]
        onChange(next)
    }
    return (
        <div className='grid gap-3'>
            {value.map((c, i) => {
                const t = PROMO_THEMES[c.theme]
                return (
                    <div key={i} className='grid gap-3 rounded-lg border p-3'>
                        <div className='flex items-center gap-2'>
                            <span className='text-xs font-semibold text-muted-foreground'>Card {i + 1}</span>
                            <span className='flex-1' />
                            <Button variant='ghost' size='icon-sm' className='cursor-pointer' disabled={i === 0} onClick={() => move(i, -1)} aria-label='Move card up'><ArrowUpIcon /></Button>
                            <Button variant='ghost' size='icon-sm' className='cursor-pointer' disabled={i === value.length - 1} onClick={() => move(i, 1)} aria-label='Move card down'><ArrowDownIcon /></Button>
                            <Button variant='ghost' size='icon-sm' className='cursor-pointer' disabled={value.length === 1} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label='Remove card'><XIcon /></Button>
                        </div>
                        <div className='grid gap-3 sm:grid-cols-[1fr_1.6fr]'>
                            {/* Live preview, same look as the storefront */}
                            <div className='flex min-h-24 flex-col justify-end rounded-xl p-4' style={{ background: t.bg }}>
                                {c.tag && <div className='text-[10px] font-bold tracking-wider uppercase' style={{ color: t.tag }}>{c.tag}</div>}
                                <div className='mt-0.5 text-sm font-bold' style={{ color: t.fg }}>{c.title || 'Card title'}</div>
                            </div>
                            <div className='grid gap-2'>
                                <div className='grid grid-cols-[96px_1fr] gap-2'>
                                    <Input className='h-9' maxLength={20} placeholder='Tag' value={c.tag ?? ''} onChange={e => update(i, { tag: e.target.value })} aria-label={`Card ${i + 1} tag`} />
                                    <Input className='h-9' maxLength={60} placeholder='Title, e.g. Organic essentials' value={c.title} onChange={e => update(i, { title: e.target.value })} aria-label={`Card ${i + 1} title`} aria-invalid={!!errors[i]} />
                                </div>
                                <Input className='h-9' maxLength={500} placeholder='Link, e.g. /category/grocery' value={c.linkUrl ?? ''} onChange={e => update(i, { linkUrl: e.target.value })} aria-label={`Card ${i + 1} link`} />
                                <div className='flex flex-wrap gap-1.5' role='radiogroup' aria-label={`Card ${i + 1} colour`}>
                                    {(Object.keys(PROMO_THEMES) as PromoTheme[]).map(k => (
                                        <button key={k} type='button' role='radio' aria-checked={c.theme === k} title={PROMO_THEMES[k].label} onClick={() => update(i, { theme: k })}
                                            className={cn('size-6 cursor-pointer rounded-full border-2', c.theme === k ? 'border-primary ring-2 ring-primary/30' : 'border-transparent')}
                                            style={{ background: PROMO_THEMES[k].bg }}>
                                            <span className='sr-only'>{PROMO_THEMES[k].label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        {errors[i] && <p className='text-xs text-destructive'>{errors[i]}</p>}
                    </div>
                )
            })}
            {value.length < 6 && (
                <Button variant='outline' className='cursor-pointer justify-self-start' onClick={() => onChange([...value, { tag: '', title: '', linkUrl: '', theme: 'MINT' }])}>
                    <PlusIcon /> Add card
                </Button>
            )}
        </div>
    )
}

export default function SectionDialog({ section, draft, open, onOpenChange, onSaved }: {
    /** Existing section to edit, or null to create from `draft` */
    section: HomeSection | null
    draft: SectionDraft | null
    open: boolean
    onOpenChange: (o: boolean) => void
    onSaved: () => void
}) {
    const [categories, setCategories] = useState<CategoryOption[]>([])
    // Remounted (keyed) each time it opens
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [form, setForm] = useState({
        type: 'PRODUCTS' as SectionType, title: '', subtitle: '', source: 'LATEST' as ProductSource,
        categoryId: '', categoryIds: [] as string[], productLimit: 12, isActive: true,
        /** Shop by category: every active category, or only the chosen ones */
        categoryMode: 'ALL' as 'ALL' | 'CHOSEN',
    })
    const [products, setProducts] = useState<ProductCard[]>([])
    const [cards, setCards] = useState<PromoCard[]>(DEFAULT_CARDS)
    const [cardErrors, setCardErrors] = useState<Record<number, string>>({})

    useEffect(() => {
        if (!open) return
        const load = async () => {
            try {
                const [cats, full] = await Promise.all([
                    storefrontApi.categoryOptions(),
                    section ? storefrontApi.section(section.id) : Promise.resolve(null),
                ])
                setCategories(cats)
                const s = full ?? section
                setForm({
                    type: s?.type ?? draft?.type ?? 'PRODUCTS',
                    title: s?.title ?? draft?.title ?? '',
                    subtitle: s?.subtitle ?? '',
                    source: s?.source ?? draft?.source ?? 'LATEST',
                    categoryId: s?.categoryId ?? '',
                    categoryIds: s?.categoryIds ?? [],
                    categoryMode: s?.categoryIds?.length ? 'CHOSEN' : 'ALL',
                    productLimit: s?.productLimit ?? 12,
                    isActive: s?.isActive ?? true,
                })
                setProducts(full?.products ?? [])
                if (full?.cards?.length) setCards(full.cards)
            } catch (err) {
                toast.error(getAxiosErrorMessage(err, 'Could not load the section'))
                onOpenChange(false)
            } finally { setLoading(false) }
        }
        load()
    }, [open, section, draft, onOpenChange])

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }
    const isProducts = form.type === 'PRODUCTS'
    const isCards = form.type === 'PROMO_CARDS'
    const activeCats = useMemo(() => categories.filter(c => c.isActive), [categories])

    const save = async () => {
        const e: Record<string, string> = {}
        if (form.title.trim().length < 2) e.title = 'Enter a title (at least 2 characters)'
        if (isProducts && form.source === 'CATEGORY' && !form.categoryId) e.categoryId = 'Choose a category'
        if (isProducts && form.source === 'MANUAL' && products.length === 0) e.products = 'Pick at least one product'
        const ce: Record<number, string> = {}
        if (isCards) cards.forEach((c, i) => {
            if (c.title.trim().length < 2) ce[i] = 'Enter a title (at least 2 characters)'
            else if (c.linkUrl?.trim() && !LINK_RE.test(c.linkUrl.trim())) ce[i] = 'Link must start with / (e.g. /category/grocery) or https://'
        })
        setCardErrors(ce)
        if (Object.keys(ce).length) e.cards = 'Fix the cards above'
        if (form.type === 'SHOP_BY_CATEGORY' && form.categoryMode === 'CHOSEN' && form.categoryIds.length === 0) e.categoryIds = 'Tick at least one category, or choose “All categories”'
        setErrors(e)
        if (Object.keys(e).length) return

        const payload = {
            title: form.title.trim(),
            subtitle: form.subtitle.trim() || null,
            isActive: form.isActive,
            ...(isProducts
                ? {
                    source: form.source,
                    categoryId: form.source === 'CATEGORY' ? form.categoryId : null,
                    productIds: form.source === 'MANUAL' ? products.map(p => p.id) : [],
                    productLimit: form.productLimit,
                }
                : isCards
                    ? { cards: cards.map(c => ({ tag: c.tag?.trim() || null, title: c.title.trim(), linkUrl: c.linkUrl?.trim() || null, theme: c.theme })) }
                    : { categoryIds: form.categoryMode === 'ALL' ? [] : form.categoryIds }),
        }
        setSaving(true)
        try {
            const res = section ? await storefrontApi.updateSection(section.id, payload) : await storefrontApi.createSection({ ...payload, type: form.type })
            toast.success(res.message)
            onSaved()
            onOpenChange(false)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not save the section'))
        } finally { setSaving(false) }
    }

    const toggleCat = (id: string) => set('categoryIds', form.categoryIds.includes(id) ? form.categoryIds.filter(x => x !== id) : [...form.categoryIds, id])

    return (
        <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
            <DialogContent className={cn('max-h-[92vh] overflow-y-auto', (isProducts && form.source === 'MANUAL') || isCards ? 'sm:max-w-3xl' : 'sm:max-w-xl')}>
                <DialogHeader>
                    <DialogTitle>{section ? 'Edit section' : isProducts ? 'Add product section' : isCards ? 'Add promo cards' : 'Add category section'}</DialogTitle>
                    <DialogDescription>
                        {isProducts ? 'A horizontal row of products on the home page. Empty rows are hidden automatically.'
                            : isCards ? 'A row of colour tiles that link to a category, a sale or any page. The section title is only shown here, not on the store.'
                                : 'A grid of categories customers can tap to browse.'}
                    </DialogDescription>
                </DialogHeader>

                {loading ? <div className='grid gap-3'><Skeleton className='h-10' /><Skeleton className='h-10' /><Skeleton className='h-24' /></div> : (
                    <div className='grid gap-4'>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            <div className='grid gap-1.5'>
                                <Label className='text-xs font-semibold text-muted-foreground'>Title</Label>
                                <Input className='h-10' maxLength={80} value={form.title} aria-invalid={!!errors.title} onChange={e => set('title', e.target.value)} placeholder='e.g. Deals of the day' />
                                {errors.title && <p className='text-xs text-destructive'>{errors.title}</p>}
                            </div>
                            <div className='grid gap-1.5'>
                                <Label className='text-xs font-semibold text-muted-foreground'>Subtitle (optional)</Label>
                                <Input className='h-10' maxLength={160} value={form.subtitle} onChange={e => set('subtitle', e.target.value)} placeholder='e.g. Fresh picks, updated daily' />
                            </div>
                        </div>

                        {isProducts ? (
                            <>
                                <div className='grid gap-4 sm:grid-cols-[1fr_140px]'>
                                    <div className='grid gap-1.5'>
                                        <Label className='text-xs font-semibold text-muted-foreground'>Products to show</Label>
                                        <Select value={form.source} onValueChange={v => set('source', v as ProductSource)}>
                                            <SelectTrigger className='h-10 w-full cursor-pointer'><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {(Object.keys(SOURCE_LABELS) as ProductSource[]).map(k => (
                                                    <SelectItem key={k} value={k} className='cursor-pointer'>{SOURCE_LABELS[k].label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className='text-xs text-muted-foreground'>{SOURCE_LABELS[form.source].hint}</p>
                                    </div>
                                    {form.source !== 'MANUAL' && (
                                        <div className='grid content-start gap-1.5'>
                                            <Label className='text-xs font-semibold text-muted-foreground'>Max products</Label>
                                            <Input type='number' min={2} max={40} className='h-10' value={form.productLimit}
                                                onChange={e => set('productLimit', Math.min(40, Math.max(2, Number(e.target.value) || 2)))} />
                                        </div>
                                    )}
                                </div>

                                {form.source === 'CATEGORY' && (
                                    <div className='grid gap-1.5'>
                                        <Label className='text-xs font-semibold text-muted-foreground'>Category</Label>
                                        <Select value={form.categoryId} onValueChange={v => set('categoryId', v)}>
                                            <SelectTrigger className='h-10 w-full cursor-pointer' aria-invalid={!!errors.categoryId}><SelectValue placeholder='Choose a category or sub-category' /></SelectTrigger>
                                            <SelectContent>
                                                {activeCats.map(c => (
                                                    <SelectGroup key={c.id}>
                                                        <SelectLabel>{c.name}</SelectLabel>
                                                        <SelectItem value={c.id} className='cursor-pointer'>All of {c.name}</SelectItem>
                                                        {c.children.filter(s => s.isActive).map(s => (
                                                            <SelectItem key={s.id} value={s.id} className='cursor-pointer pl-6'>{s.name}</SelectItem>
                                                        ))}
                                                    </SelectGroup>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {errors.categoryId && <p className='text-xs text-destructive'>{errors.categoryId}</p>}
                                    </div>
                                )}

                                {form.source === 'MANUAL' && (
                                    <div className='grid gap-1.5'>
                                        <ProductPicker value={products} onChange={v => { setProducts(v); setErrors(e => ({ ...e, products: '' })) }} />
                                        {errors.products && <p className='text-xs text-destructive'>{errors.products}</p>}
                                    </div>
                                )}
                            </>
                        ) : isCards ? (
                            <div className='grid gap-1.5'>
                                <Label className='text-xs font-semibold text-muted-foreground'>Cards ({cards.length}/6)</Label>
                                <PromoCardsEditor value={cards} onChange={v => { setCards(v); setCardErrors({}) }} errors={cardErrors} />
                            </div>
                        ) : (
                            <div className='grid gap-3'>
                                <Label className='text-xs font-semibold text-muted-foreground'>Categories to show</Label>
                                <div className='grid gap-2 sm:grid-cols-2' role='radiogroup' aria-label='Categories to show'>
                                    {([
                                        { value: 'ALL', title: 'All categories', hint: `Every active category (${activeCats.length} now). New ones appear automatically.` },
                                        { value: 'CHOSEN', title: 'Choose categories', hint: 'Only the ones you tick, in your order.' },
                                    ] as const).map(o => {
                                        const on = form.categoryMode === o.value
                                        return (
                                            <button key={o.value} type='button' role='radio' aria-checked={on} onClick={() => { set('categoryMode', o.value); setErrors(e => ({ ...e, categoryIds: '' })) }}
                                                className={cn('flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 text-left transition-colors', on ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/60')}>
                                                <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border', on ? 'border-primary' : 'border-input')}>
                                                    {on && <span className='size-2 rounded-full bg-primary' />}
                                                </span>
                                                <span>
                                                    <span className='block text-sm font-semibold'>{o.title}</span>
                                                    <span className='block text-xs text-muted-foreground'>{o.hint}</span>
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>

                                {form.categoryMode === 'ALL' ? (
                                    <div className='flex flex-wrap gap-1.5 rounded-lg bg-muted/50 p-3'>
                                        {activeCats.length === 0
                                            ? <span className='text-xs text-muted-foreground'>No active categories yet.</span>
                                            : activeCats.map(c => <span key={c.id} className='rounded-full border bg-background px-2.5 py-1 text-xs font-medium'>{c.name}</span>)}
                                    </div>
                                ) : (
                                    <div className='grid gap-1.5'>
                                        <div className='flex items-center justify-between text-xs text-muted-foreground'>
                                            <span>{form.categoryIds.length} of {activeCats.length} ticked — numbers show the order</span>
                                            <span className='flex gap-3'>
                                                <button type='button' className='cursor-pointer font-semibold text-primary hover:underline' onClick={() => set('categoryIds', activeCats.map(c => c.id))}>Tick all</button>
                                                {form.categoryIds.length > 0 && <button type='button' className='cursor-pointer font-semibold text-primary hover:underline' onClick={() => set('categoryIds', [])}>Clear</button>}
                                            </span>
                                        </div>
                                        <div className={cn('grid max-h-64 gap-1 overflow-y-auto rounded-lg border p-1 sm:grid-cols-2', errors.categoryIds && 'border-destructive')}>
                                            {activeCats.map(c => {
                                                const idx = form.categoryIds.indexOf(c.id)
                                                return (
                                                    <button key={c.id} type='button' role='checkbox' aria-checked={idx >= 0} onClick={() => toggleCat(c.id)}
                                                        className={cn('flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted', idx >= 0 && 'bg-primary/10')}>
                                                        <span className={cn('flex size-5 shrink-0 items-center justify-center rounded border text-[10px] font-bold', idx >= 0 ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                                                            {idx >= 0 ? idx + 1 : ''}
                                                        </span>
                                                        <span className='truncate'>{c.name}</span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                        {errors.categoryIds && <p className='text-xs text-destructive'>{errors.categoryIds}</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        <label className='flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3'>
                            <span>
                                <span className='block text-sm font-semibold'>Show on home page</span>
                                <span className='block text-xs text-muted-foreground'>Turn off to hide it without deleting.</span>
                            </span>
                            <Switch checked={form.isActive} onCheckedChange={v => set('isActive', v)} />
                        </label>
                    </div>
                )}

                <DialogFooter>
                    <Button variant='outline' className='cursor-pointer' onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                    <Button className='min-w-24 cursor-pointer' onClick={save} disabled={saving || loading}>{saving && <Spinner />} Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
