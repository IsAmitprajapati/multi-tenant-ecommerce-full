import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { Building2Icon, CheckIcon, CircleCheckIcon, CircleXIcon, Loader2Icon, PaletteIcon, PercentIcon, UserIcon } from 'lucide-react'
import PageHeader, { scrollPageToTop } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn, displayUrl } from '@/lib/utils'
import { sellerApi, type BusinessType, type ISellerDetail, type SellerMeta } from '@/api/seller'
import FileUploadTile, { type UploadValue } from './_component/FileUploadTile'

const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/
const PHONE = /^\+?[1-9]\d{9,14}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const schema = z.object({
    legalBusinessName: z.string().trim().min(2, 'Business name is required'),
    businessType: z.string().min(1, 'Select a business type'),
    registeredAddress: z.string().trim().min(5, 'Registered address is required'),
    gstNumber: z.string().trim().toUpperCase().refine(v => !v || GST.test(v), 'GST number is not valid (e.g. 29ABCDE1234F1Z5)'),
    panNumber: z.string().trim().toUpperCase().refine(v => !v || PAN.test(v), 'PAN number is not valid (e.g. ABCDE1234F)'),
    ownerName: z.string().trim().min(2, 'Owner name is required'),
    ownerPhone: z.string().transform(v => v.replace(/[\s-]/g, '')).refine(v => PHONE.test(v), 'Enter a valid phone number'),
    name: z.string().trim().min(2, 'Seller name is required'),
    slug: z.string().min(3, 'Use at least 3 characters').max(50).regex(SLUG, 'Only lowercase letters, numbers and hyphens'),
    category: z.string().min(1, 'Select a category'),
    brandColor: z.string().min(1),
    commissionRate: z.string().refine(v => v !== '' && !Number.isNaN(Number(v)) && Number(v) >= 0 && Number(v) <= 50, 'Enter a rate between 0 and 50'),
})

type Form = z.input<typeof schema>
type Errors = Partial<Record<keyof Form, string>>

const slugify = (v: string) =>
    v.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

function Field({ label, htmlFor, error, hint, className, children }: {
    label: string; htmlFor?: string; error?: string; hint?: React.ReactNode; className?: string; children: React.ReactNode
}) {
    return (
        <div className={cn('grid min-w-0 content-start gap-1.5', className)}>
            <Label htmlFor={htmlFor} className='text-xs font-semibold text-muted-foreground'>{label}</Label>
            {children}
            {error ? <p className='text-xs text-destructive'>{error}</p> : hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
        </div>
    )
}

function Section({ icon: Icon, title, description, children }: { icon: typeof UserIcon; title: string; description?: string; children: React.ReactNode }) {
    return (
        <Card>
            <CardHeader className='border-b'>
                <CardTitle className='flex items-center gap-2 text-base font-semibold'><Icon className='size-4 text-primary' /> {title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>{children}</CardContent>
        </Card>
    )
}

const SellerEditPage = () => {
    const { sellerId } = useParams<{ sellerId: string }>()
    const navigate = useNavigate()
    const { can } = usePermission()
    const canEditCommission = can('SELLERS', 'MANAGE')

    const [seller, setSeller] = useState<ISellerDetail | null>(null)
    const [meta, setMeta] = useState<SellerMeta | null>(null)
    const [form, setForm] = useState<Form | null>(null)
    const [errors, setErrors] = useState<Errors>({})
    const [saving, setSaving] = useState(false)
    // Logo: undefined = unchanged, null = removed, value = newly uploaded
    const [logo, setLogo] = useState<UploadValue | null | undefined>(undefined)
    const [slugState, setSlugState] = useState<{ checking: boolean; available: boolean | null; reason: string | null }>({ checking: false, available: null, reason: null })

    const detailPath = `/dashboard/sellers/${sellerId}`

    useEffect(() => {
        if (!sellerId) return
        Promise.all([sellerApi.get(sellerId), sellerApi.meta()])
            .then(([s, m]) => {
                const d = s.data
                setSeller(d)
                setMeta(m.data)
                setForm({
                    legalBusinessName: d.businessDetails?.legalBusinessName ?? '',
                    businessType: d.businessDetails?.businessType ?? '',
                    registeredAddress: d.businessDetails?.registeredAddress ?? '',
                    gstNumber: d.businessDetails?.gstNumber ?? '',
                    panNumber: d.businessDetails?.panNumber ?? '',
                    ownerName: d.businessDetails?.contactPersonName ?? d.owner.fullName,
                    ownerPhone: d.businessDetails?.contactPersonMobile ?? d.owner.phone ?? '',
                    name: d.name,
                    slug: d.slug,
                    category: d.category,
                    brandColor: d.brandColor,
                    commissionRate: String(d.commissionRate),
                })
            })
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Seller not found'))
                navigate('/dashboard/sellers', { replace: true })
            })
    }, [sellerId, navigate])

    // Debounced uniqueness check — the seller's own current URL is always fine
    const slugReq = useRef(0)
    const slug = form?.slug ?? ''
    useEffect(() => {
        if (!seller || slug === seller.slug || !SLUG.test(slug) || slug.length < 3) {
            setSlugState({ checking: false, available: slug === seller?.slug ? true : null, reason: null })
            return
        }
        const id = ++slugReq.current
        setSlugState(s => ({ ...s, checking: true }))
        const t = setTimeout(() => {
            sellerApi.slugAvailability(slug)
                .then(res => id === slugReq.current && setSlugState({ checking: false, available: res.data.available, reason: res.data.reason }))
                .catch(() => id === slugReq.current && setSlugState({ checking: false, available: null, reason: null }))
        }, 400)
        return () => clearTimeout(t)
    }, [slug, seller])

    if (!seller || !meta || !form) {
        return (
            <div>
                <Skeleton className='mb-6 h-14 w-72' />
                <div className='grid gap-6 lg:grid-cols-3'>
                    <div className='grid gap-6 lg:col-span-2'><Skeleton className='h-72' /><Skeleton className='h-48' /></div>
                    <Skeleton className='h-96' />
                </div>
            </div>
        )
    }

    const set = (k: keyof Form, v: string) => { setForm(f => f && ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
    const category = meta.categories.find(c => c.key === form.category)
    const pageBase = displayUrl(meta.sellerPageBase)
    const currentLogo: UploadValue | null =
        logo === undefined ? (seller.logoUrl ? { fileId: seller.id, name: 'Current logo', url: seller.logoUrl } : null) : logo

    const save = async () => {
        const r = schema.safeParse(form)
        const errs: Errors = {}
        if (!r.success) r.error.issues.forEach(i => { const k = i.path[0] as keyof Form; if (!errs[k]) errs[k] = i.message })
        if (!errs.slug && slugState.available === false) errs.slug = slugState.reason ?? 'This page URL is taken'
        if (!errs.slug && slugState.checking) errs.slug = 'Still checking if this URL is available…'
        if (Object.keys(errs).length || !r.success) { setErrors(errs); scrollPageToTop(); return }

        const v = r.data
        setSaving(true)
        try {
            await sellerApi.update(seller.id, {
                business: {
                    legalBusinessName: v.legalBusinessName,
                    businessType: v.businessType as BusinessType,
                    registeredAddress: v.registeredAddress,
                    gstNumber: v.gstNumber,
                    panNumber: v.panNumber,
                    ownerName: v.ownerName,
                    ownerPhone: v.ownerPhone,
                },
                profile: {
                    name: v.name,
                    slug: v.slug,
                    category: v.category,
                    brandColor: v.brandColor,
                    ...(logo && { logoFileId: logo.fileId }),
                    ...(logo === null && { removeLogo: true }),
                },
                ...(canEditCommission && Number(v.commissionRate) !== seller.commissionRate && { commissionRate: Number(v.commissionRate) }),
            })
            toast.success('Seller details updated')
            navigate(detailPath)
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Failed to update seller')
            const field = isAxiosError<{ field?: string }>(err) ? err.response?.data?.field : undefined
            if (field === 'slug') {
                setSlugState({ checking: false, available: false, reason: message })
                setErrors({ slug: message })
                scrollPageToTop()
            }
            toast.error(message)
        } finally {
            setSaving(false)
        }
    }

    const actions = (
        <>
            <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(detailPath)} disabled={saving}>Cancel</Button>
            <Button className='h-10 min-w-32 cursor-pointer' onClick={save} disabled={saving}>
                {saving && <Spinner />} Save changes
            </Button>
        </>
    )

    return (
        <div className='pb-10'>
            <PageHeader back title={`Edit ${seller.name}`} description='Update business details, owner contact and the seller page.' actions={actions} />

            <div className='grid gap-6 lg:grid-cols-3'>
                <div className='grid content-start gap-6 lg:col-span-2'>
                    <Section icon={Building2Icon} title='Business details' description='Legal and tax information.'>
                        <Field label='Business name' htmlFor='legalBusinessName' error={errors.legalBusinessName}>
                            <Input id='legalBusinessName' className='h-10' value={form.legalBusinessName} aria-invalid={!!errors.legalBusinessName}
                                onChange={e => set('legalBusinessName', e.target.value)} />
                        </Field>
                        <Field label='Business type' error={errors.businessType}>
                            <Select value={form.businessType} onValueChange={v => set('businessType', v)}>
                                <SelectTrigger className='h-10! w-full'><SelectValue placeholder='Select business type' /></SelectTrigger>
                                <SelectContent position='popper'>
                                    {meta.businessTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </Field>
                        <Field label='Registered address' htmlFor='registeredAddress' error={errors.registeredAddress} className='sm:col-span-2'>
                            <Input id='registeredAddress' className='h-10' value={form.registeredAddress} aria-invalid={!!errors.registeredAddress}
                                onChange={e => set('registeredAddress', e.target.value)} />
                        </Field>
                        <Field label='GST number (optional)' htmlFor='gstNumber' error={errors.gstNumber}>
                            <Input id='gstNumber' className='h-10 uppercase' maxLength={15} value={form.gstNumber} aria-invalid={!!errors.gstNumber}
                                onChange={e => set('gstNumber', e.target.value.toUpperCase())} />
                        </Field>
                        <Field label='PAN number (optional)' htmlFor='panNumber' error={errors.panNumber}>
                            <Input id='panNumber' className='h-10 uppercase' maxLength={10} value={form.panNumber} aria-invalid={!!errors.panNumber}
                                onChange={e => set('panNumber', e.target.value.toUpperCase())} />
                        </Field>
                    </Section>

                    <Section icon={UserIcon} title='Owner' description='Contact details are also updated on the owner’s account.'>
                        <Field label='Owner name' htmlFor='ownerName' error={errors.ownerName}>
                            <Input id='ownerName' className='h-10' value={form.ownerName} aria-invalid={!!errors.ownerName}
                                onChange={e => set('ownerName', e.target.value)} />
                        </Field>
                        <Field label='Owner phone' htmlFor='ownerPhone' error={errors.ownerPhone}>
                            <Input id='ownerPhone' className='h-10' type='tel' value={form.ownerPhone} aria-invalid={!!errors.ownerPhone}
                                onChange={e => set('ownerPhone', e.target.value)} />
                        </Field>
                        <Field label='Owner email' className='sm:col-span-2' hint='This is the owner’s sign-in email and can’t be changed here.'>
                            <Input className='h-10' value={seller.owner.email} disabled readOnly />
                        </Field>
                    </Section>
                </div>

                <div className='grid content-start gap-6'>
                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><PaletteIcon className='size-4 text-primary' /> Seller page &amp; branding</CardTitle>
                        </CardHeader>
                        <CardContent className='grid gap-5'>
                            <Field label='Seller name' htmlFor='name' error={errors.name}>
                                <Input id='name' className='h-10' value={form.name} aria-invalid={!!errors.name} onChange={e => set('name', e.target.value)} />
                            </Field>
                            <Field label='Page URL' htmlFor='slug' error={errors.slug}
                                hint={!errors.slug && form.slug !== seller.slug && slugState.available === true ? <span className='text-primary'>Available</span>
                                    : !errors.slug && slugState.available === false ? <span className='text-destructive'>{slugState.reason}</span>
                                        : form.slug !== seller.slug ? 'Changing the URL breaks links shared with the old one.' : undefined}>
                                <div className={cn('flex h-10 items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50', errors.slug && 'border-destructive')}>
                                    <span className='max-w-[55%] shrink-0 truncate pl-3 text-xs text-muted-foreground' title={pageBase}>{pageBase}</span>
                                    <input id='slug' className='h-full min-w-0 flex-1 bg-transparent pr-2 text-sm outline-none' value={form.slug}
                                        onChange={e => set('slug', slugify(e.target.value))} />
                                    <span className='pr-3'>
                                        {slugState.checking ? <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
                                            : form.slug !== seller.slug && slugState.available === true ? <CircleCheckIcon className='size-4 text-primary' />
                                                : slugState.available === false ? <CircleXIcon className='size-4 text-destructive' /> : null}
                                    </span>
                                </div>
                            </Field>
                            <Field label='Category' error={errors.category}
                                hint={category?.requiresFssai ? 'FSSAI license required for this category' : undefined}>
                                <Select value={form.category} onValueChange={v => set('category', v)}>
                                    <SelectTrigger className='h-10! w-full'><SelectValue /></SelectTrigger>
                                    <SelectContent position='popper'>
                                        {meta.categories.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label='Logo'>
                                <FileUploadTile kind='logo' label={currentLogo ? 'Logo' : 'Upload logo'} hint='PNG, JPG or WEBP · up to 5 MB'
                                    value={currentLogo} onChange={v => setLogo(v)} disabled={saving} />
                            </Field>
                            <div className='grid gap-1.5'>
                                <span className='text-xs font-semibold text-muted-foreground'>Brand color</span>
                                <div role='radiogroup' aria-label='Brand color' className='flex flex-wrap gap-2.5'>
                                    {meta.brandColors.map(hex => {
                                        const active = form.brandColor === hex
                                        return (
                                            <button key={hex} type='button' role='radio' aria-checked={active} aria-label={hex}
                                                onClick={() => set('brandColor', hex)}
                                                className={cn('flex size-9 cursor-pointer items-center justify-center rounded-[10px] ring-offset-2 ring-offset-card transition', active ? 'ring-2 ring-foreground' : 'hover:scale-105')}
                                                style={{ background: hex }}>
                                                {active && <CheckIcon className='size-4 text-white' />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><PercentIcon className='size-4 text-primary' /> Commission</CardTitle>
                            <CardDescription>{canEditCommission ? 'Percentage taken from each order.' : 'Only admins with manage access can change this.'}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Field label='Commission rate (%)' htmlFor='commissionRate' error={errors.commissionRate}
                                hint={category ? `${category.label} default is ${category.commissionRate}%` : undefined}>
                                <Input id='commissionRate' className='h-10' type='number' min={0} max={50} step='0.5'
                                    value={form.commissionRate} disabled={!canEditCommission} aria-invalid={!!errors.commissionRate}
                                    onChange={e => set('commissionRate', e.target.value)} />
                            </Field>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <div className='mt-6 flex justify-end gap-2'>{actions}</div>
        </div>
    )
}

export default SellerEditPage
