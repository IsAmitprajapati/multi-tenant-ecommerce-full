import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
    ArrowDownIcon, ArrowUpIcon, CalendarClockIcon, ExternalLinkIcon, FlameIcon, GalleryHorizontalIcon, ImageIcon, LayoutGridIcon,
    MoreHorizontalIcon, PanelsTopLeftIcon, PencilIcon, PlusIcon, SparklesIcon, StarIcon, TagIcon, Trash2Icon, type LucideIcon,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import {
    CUSTOMER_STORE_URL, SOURCE_LABELS, storefrontApi, type BannerMode, type HomeBanner, type HomeSection, type StorefrontSettings,
} from '@/api/storefront'
import BannerDialog from './_component/BannerDialog'
import SectionDialog, { type SectionDraft } from './_component/SectionDialog'

/** Ready-made section types offered under "Add section" */
const PRESETS: { draft: SectionDraft; Icon: LucideIcon; hint: string }[] = [
    { draft: { type: 'SHOP_BY_CATEGORY', title: 'Shop by category' }, Icon: LayoutGridIcon, hint: 'Category tiles' },
    { draft: { type: 'PRODUCTS', title: 'Deals of the day', source: 'DEALS' }, Icon: TagIcon, hint: 'Biggest discounts' },
    { draft: { type: 'PRODUCTS', title: 'Featured for you', source: 'MANUAL' }, Icon: StarIcon, hint: 'Hand-picked products' },
    { draft: { type: 'PRODUCTS', title: 'New arrivals', source: 'LATEST' }, Icon: SparklesIcon, hint: 'Newest products' },
    { draft: { type: 'PRODUCTS', title: 'Trending now', source: 'TRENDING' }, Icon: FlameIcon, hint: 'Most ordered' },
    { draft: { type: 'PRODUCTS', title: 'Best of ', source: 'CATEGORY' }, Icon: GalleryHorizontalIcon, hint: 'One category' },
    { draft: { type: 'PROMO_CARDS', title: 'Collections' }, Icon: PanelsTopLeftIcon, hint: 'Colour tiles with a link' },
]

const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

function bannerSchedule(b: HomeBanner) {
    const now = Date.now()
    if (b.endsAt && new Date(b.endsAt).getTime() <= now) return { label: `Ended ${fmtDate(b.endsAt)}`, live: false }
    if (b.startsAt && new Date(b.startsAt).getTime() > now) return { label: `Starts ${fmtDate(b.startsAt)}`, live: false }
    if (b.endsAt) return { label: `Until ${fmtDate(b.endsAt)}`, live: true }
    return null
}

function sectionSummary(s: HomeSection) {
    if (s.type === 'SHOP_BY_CATEGORY') return s.categoryIds.length ? `${s.categoryIds.length} chosen categories` : 'All active categories'
    if (s.type === 'PROMO_CARDS') return `Promo cards · ${s.cards.map(c => c.title).join(', ')}`
    const src = s.source ? SOURCE_LABELS[s.source].label : '—'
    if (s.source === 'MANUAL') return `${src} · ${s.pickedCount ?? 0} products`
    if (s.source === 'CATEGORY') return `${src}: ${s.category ? (s.category.parent ? `${s.category.parent.name} › ${s.category.name}` : s.category.name) : 'category removed'} · up to ${s.productLimit}`
    return `${src} · up to ${s.productLimit}`
}

function OrderButtons({ index, count, onMove, disabled }: { index: number; count: number; onMove: (d: -1 | 1) => void; disabled?: boolean }) {
    return (
        <div className='flex flex-col'>
            <Button variant='ghost' size='icon-xs' className='cursor-pointer' disabled={disabled || index === 0} onClick={() => onMove(-1)} aria-label='Move up'><ArrowUpIcon /></Button>
            <Button variant='ghost' size='icon-xs' className='cursor-pointer' disabled={disabled || index === count - 1} onClick={() => onMove(1)} aria-label='Move down'><ArrowDownIcon /></Button>
        </div>
    )
}

type Confirm = { kind: 'banner' | 'section'; id: string; name: string }

export default function HomePageBuilder() {
    const { can } = usePermission()
    const canEdit = can('STOREFRONT', 'EDIT')
    const canDelete = can('STOREFRONT', 'MANAGE')

    const [settings, setSettings] = useState<StorefrontSettings | null>(null)
    const [banners, setBanners] = useState<HomeBanner[] | null>(null)
    const [sections, setSections] = useState<HomeSection[] | null>(null)
    const [bannerDialog, setBannerDialog] = useState<{ open: boolean; banner: HomeBanner | null; key: number }>({ open: false, banner: null, key: 0 })
    const [sectionDialog, setSectionDialog] = useState<{ open: boolean; section: HomeSection | null; draft: SectionDraft | null; key: number }>({ open: false, section: null, draft: null, key: 0 })
    const [confirm, setConfirm] = useState<Confirm | null>(null)
    const [busy, setBusy] = useState(false)
    // Stable: SectionDialog reloads when it changes
    const setSectionOpen = useCallback((o: boolean) => setSectionDialog(d => ({ ...d, open: o })), [])

    const loadBanners = useCallback(() => storefrontApi.banners().then(setBanners).catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load banners'))), [])
    const loadSections = useCallback(() => storefrontApi.sections().then(setSections).catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load sections'))), [])

    useEffect(() => {
        storefrontApi.settings().then(setSettings).catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load settings')))
        loadBanners()
        loadSections()
    }, [loadBanners, loadSections])

    const saveSettings = async (patch: Partial<StorefrontSettings>) => {
        if (!settings) return
        const prev = settings
        setSettings({ ...settings, ...patch })
        try {
            await storefrontApi.saveSettings(patch)
            toast.success('Banner settings saved')
        } catch (err) {
            setSettings(prev)
            toast.error(getAxiosErrorMessage(err, 'Could not save'))
        }
    }

    /** Optimistic reorder, persisted in one call */
    const move = async <T extends { id: string }>(list: T[], setList: (v: T[]) => void, i: number, d: -1 | 1, persist: (ids: string[]) => Promise<unknown>) => {
        const next = [...list]
        ;[next[i], next[i + d]] = [next[i + d], next[i]]
        setList(next)
        try { await persist(next.map(x => x.id)) } catch (err) {
            setList(list)
            toast.error(getAxiosErrorMessage(err, 'Could not reorder'))
        }
    }

    const toggleBanner = async (b: HomeBanner) => {
        setBanners(list => list?.map(x => x.id === b.id ? { ...x, isActive: !b.isActive } : x) ?? null)
        try { toast.success((await storefrontApi.toggleBanner(b.id, !b.isActive)).message) } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not update'))
            loadBanners()
        }
    }

    const toggleSection = async (s: HomeSection) => {
        setSections(list => list?.map(x => x.id === s.id ? { ...x, isActive: !s.isActive } : x) ?? null)
        try { toast.success((await storefrontApi.toggleSection(s.id, !s.isActive)).message) } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not update'))
            loadSections()
        }
    }

    const runDelete = async () => {
        if (!confirm) return
        setBusy(true)
        try {
            const res = confirm.kind === 'banner' ? await storefrontApi.deleteBanner(confirm.id) : await storefrontApi.deleteSection(confirm.id)
            toast.success(res.message)
            setConfirm(null)
            if (confirm.kind === 'banner') loadBanners()
            else loadSections()
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not delete'))
        } finally { setBusy(false) }
    }

    const liveBanners = banners?.filter(b => b.isActive && (bannerSchedule(b)?.live ?? true)).length ?? 0

    return (
        <div className='pb-10'>
            <PageHeader
                title='Home page'
                description='What customers see on the storefront home page: hero banners on top, then your sections in order.'
                actions={(
                    <Button variant='outline' className='h-10 cursor-pointer' asChild>
                        <a href={CUSTOMER_STORE_URL} target='_blank' rel='noreferrer'><ExternalLinkIcon /> View store</a>
                    </Button>
                )}
            />

            <div className='grid gap-6'>
                {/* ───── Banners ───── */}
                <Card>
                    <CardHeader className='border-b'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div>
                                <CardTitle className='flex items-center gap-2 text-base font-semibold'><ImageIcon className='size-4 text-primary' /> Hero banners</CardTitle>
                                <CardDescription className='mt-1'>
                                    {settings && <>{settings.bannerMode === 'SINGLE' ? 'Single banner: only the first live banner is shown.' : 'Carousel: live banners rotate automatically.'} {liveBanners} live now.</>}
                                </CardDescription>
                            </div>
                            {canEdit && <Button className='cursor-pointer' onClick={() => setBannerDialog(d => ({ open: true, banner: null, key: d.key + 1 }))}><PlusIcon /> Add banner</Button>}
                        </div>
                    </CardHeader>
                    <CardContent className='grid gap-4'>
                        {settings ? (
                            <div className='flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-muted/50 p-3'>
                                <div className='flex items-center gap-3'>
                                    <span className='text-sm font-medium'>Display</span>
                                    <ToggleGroup type='single' variant='outline' size='sm' value={settings.bannerMode} disabled={!canEdit}
                                        onValueChange={v => v && v !== settings.bannerMode && saveSettings({ bannerMode: v as BannerMode })}>
                                        <ToggleGroupItem value='CAROUSEL' className='cursor-pointer px-3 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'>Carousel</ToggleGroupItem>
                                        <ToggleGroupItem value='SINGLE' className='cursor-pointer px-3 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'>Single banner</ToggleGroupItem>
                                    </ToggleGroup>
                                </div>
                                {settings.bannerMode === 'CAROUSEL' && (
                                    <label className='flex items-center gap-2 text-sm'>
                                        <span className='font-medium'>Change every</span>
                                        <Input type='number' min={2} max={30} className='h-8 w-16' disabled={!canEdit}
                                            defaultValue={settings.autoplaySeconds} key={settings.autoplaySeconds}
                                            onBlur={e => {
                                                const v = Math.min(30, Math.max(2, Number(e.target.value) || 5))
                                                if (v !== settings.autoplaySeconds) saveSettings({ autoplaySeconds: v })
                                                else e.target.value = String(v)
                                            }} />
                                        <span className='text-muted-foreground'>seconds</span>
                                    </label>
                                )}
                            </div>
                        ) : <Skeleton className='h-14' />}

                        {banners === null
                            ? <div className='grid gap-2'>{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className='h-20' />)}</div>
                            : banners.length === 0
                                ? <p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>No banners yet — the home page starts straight with your sections.</p>
                                : (
                                    <ul className='grid gap-2'>
                                        {banners.map((b, i) => {
                                            const sched = bannerSchedule(b)
                                            return (
                                                <li key={b.id} className={cn('flex items-center gap-3 rounded-lg border p-2 pr-3', !b.isActive && 'bg-muted/40')}>
                                                    {canEdit && <OrderButtons index={i} count={banners.length} onMove={d => move(banners, setBanners, i, d, storefrontApi.reorderBanners)} />}
                                                    <img src={b.imageUrl} alt='' className={cn('aspect-[16/5] w-32 shrink-0 rounded-md border object-cover sm:w-44', !b.isActive && 'opacity-50')} />
                                                    <div className='min-w-0 flex-1'>
                                                        <div className='truncate text-sm font-semibold'>{b.title}</div>
                                                        {b.subtitle && <div className='truncate text-xs text-muted-foreground'>{b.subtitle}</div>}
                                                        <div className='mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                                                            {b.linkUrl && <span className='truncate'>→ {b.linkUrl}</span>}
                                                            {sched && <span className={cn('inline-flex items-center gap-1', !sched.live && 'text-amber-700')}><CalendarClockIcon className='size-3' />{sched.label}</span>}
                                                        </div>
                                                    </div>
                                                    {canEdit && <Switch checked={b.isActive} onCheckedChange={() => toggleBanner(b)} aria-label={b.isActive ? 'Hide banner' : 'Show banner'} />}
                                                    {canEdit && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${b.title}`}><MoreHorizontalIcon /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align='end'>
                                                                <DropdownMenuItem className='cursor-pointer' onSelect={() => setBannerDialog(d => ({ open: true, banner: b, key: d.key + 1 }))}><PencilIcon /> Edit</DropdownMenuItem>
                                                                {canDelete && <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setConfirm({ kind: 'banner', id: b.id, name: b.title })}><Trash2Icon /> Delete</DropdownMenuItem>}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                    </CardContent>
                </Card>

                {/* ───── Sections ───── */}
                <Card>
                    <CardHeader className='border-b'>
                        <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div>
                                <CardTitle className='flex items-center gap-2 text-base font-semibold'><LayoutGridIcon className='size-4 text-primary' /> Sections</CardTitle>
                                <CardDescription className='mt-1'>Shown below the banners, top to bottom. A section with no matching live products is hidden automatically.</CardDescription>
                            </div>
                            {canEdit && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button className='cursor-pointer'><PlusIcon /> Add section</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align='end' className='w-64'>
                                        <DropdownMenuLabel className='text-xs text-muted-foreground'>Choose a section type</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {PRESETS.map(p => (
                                            <DropdownMenuItem key={p.draft.title} className='cursor-pointer py-2' onSelect={() => setSectionDialog(d => ({ open: true, section: null, draft: p.draft, key: d.key + 1 }))}>
                                                <p.Icon />
                                                <span className='flex-1'>
                                                    <span className='block font-medium'>{p.draft.source === 'CATEGORY' ? 'Category-wise products' : p.draft.type === 'PROMO_CARDS' ? 'Promo cards' : p.draft.title}</span>
                                                    <span className='block text-xs text-muted-foreground'>{p.hint}</span>
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {sections === null
                            ? <div className='grid gap-2'>{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='h-16' />)}</div>
                            : sections.length === 0
                                ? <p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>No sections yet. Add “Shop by category” or a product row to get started.</p>
                                : (
                                    <ul className='grid gap-2'>
                                        {sections.map((s, i) => {
                                            const preset = s.type === 'SHOP_BY_CATEGORY' ? PRESETS[0] : s.type === 'PROMO_CARDS' ? PRESETS[6] : PRESETS.find(p => p.draft.source === s.source) ?? PRESETS[3]
                                            return (
                                                <li key={s.id} className={cn('flex items-center gap-3 rounded-lg border p-2 pr-3', !s.isActive && 'bg-muted/40')}>
                                                    {canEdit && <OrderButtons index={i} count={sections.length} onMove={d => move(sections, setSections, i, d, storefrontApi.reorderSections)} />}
                                                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary', !s.isActive && 'opacity-50')}><preset.Icon className='size-5' /></span>
                                                    <div className='min-w-0 flex-1'>
                                                        <div className='flex items-center gap-2'>
                                                            <span className='truncate text-sm font-semibold'>{s.title}</span>
                                                            {!s.isActive && <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground'>Hidden</span>}
                                                        </div>
                                                        <div className='truncate text-xs text-muted-foreground'>{s.type === 'SHOP_BY_CATEGORY' ? 'Shop by category · ' : ''}{sectionSummary(s)}</div>
                                                    </div>
                                                    {canEdit && <Switch checked={s.isActive} onCheckedChange={() => toggleSection(s)} aria-label={s.isActive ? 'Hide section' : 'Show section'} />}
                                                    {canEdit && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${s.title}`}><MoreHorizontalIcon /></Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align='end'>
                                                                <DropdownMenuItem className='cursor-pointer' onSelect={() => setSectionDialog(d => ({ open: true, section: s, draft: null, key: d.key + 1 }))}><PencilIcon /> Edit</DropdownMenuItem>
                                                                {canDelete && <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setConfirm({ kind: 'section', id: s.id, name: s.title })}><Trash2Icon /> Delete</DropdownMenuItem>}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}
                    </CardContent>
                </Card>
            </div>

            <BannerDialog key={`b${bannerDialog.key}`} open={bannerDialog.open} banner={bannerDialog.banner} onOpenChange={o => setBannerDialog(d => ({ ...d, open: o }))} onSaved={loadBanners} />
            <SectionDialog key={`s${sectionDialog.key}`} open={sectionDialog.open} section={sectionDialog.section} draft={sectionDialog.draft}
                onOpenChange={setSectionOpen} onSaved={loadSections} />

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={o => !o && setConfirm(null)}
                    title={`Delete “${confirm.name}”?`}
                    description={confirm.kind === 'banner' ? 'The banner is removed from the home page. This can’t be undone.' : 'The section is removed from the home page. Products aren’t affected. This can’t be undone.'}
                    confirmLabel='Delete'
                    destructive
                    loading={busy}
                    onConfirm={runDelete}
                />
            )}
        </div>
    )
}
