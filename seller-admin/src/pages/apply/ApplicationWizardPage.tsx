import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { AlertTriangleIcon, CheckIcon, CircleCheckIcon, CircleXIcon, InfoIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, displayUrl } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { fetchMe } from '@/store/auth/authSlice'
import { sellerPortalApi, type BusinessType, type KycDocumentType, type SellerApplication, type SellerMeta } from '@/api/seller-portal'
import FileUploadTile, { type UploadValue } from '@/components/upload/FileUploadTile'
import { ApplyStepper } from '@/layouts/ApplyLayout'

const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/
const PHONE = /^\+?[1-9]\d{9,14}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const profileSchema = z.object({
    name: z.string().trim().min(2, 'Seller name is required'),
    slug: z.string().min(3, 'Use at least 3 characters').max(50).regex(SLUG, 'Only lowercase letters, numbers and hyphens'),
    category: z.string().min(1, 'Select a category'),
    brandColor: z.string().min(1),
})
const businessSchema = z.object({
    legalBusinessName: z.string().trim().min(2, 'Business name is required'),
    businessType: z.string().min(1, 'Select a business type'),
    registeredAddress: z.string().trim().min(5, 'Registered address is required'),
    gstNumber: z.string().trim().toUpperCase().refine(v => !v || GST.test(v), 'GST number is not valid (e.g. 29ABCDE1234F1Z5)'),
    panNumber: z.string().trim().toUpperCase().refine(v => !v || PAN.test(v), 'PAN number is not valid (e.g. ABCDE1234F)'),
    ownerName: z.string().trim().min(2, 'Contact person name is required'),
    ownerPhone: z.string().transform(v => v.replace(/[\s-]/g, '')).refine(v => PHONE.test(v), 'Enter a valid phone number'),
})

type Profile = z.input<typeof profileSchema>
type Business = z.input<typeof businessSchema>
type Errors = Record<string, string | undefined>

/** Wizard steps 2–5 — index 1..4 in the shared stepper (step 0 = account) */
const FIRST = 1
const LAST = 4

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

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className='flex flex-col gap-1 border-b py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
            <span className='text-sm text-muted-foreground'>{label}</span>
            <span className='text-sm font-semibold sm:text-right'>{children}</span>
        </div>
    )
}

export default function ApplicationWizardPage() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const user = useAppSelector(s => s.auth.user)

    const [meta, setMeta] = useState<SellerMeta | null>(null)
    const [existing, setExisting] = useState<SellerApplication | null>(null)
    const [loading, setLoading] = useState(true)
    const [step, setStep] = useState(FIRST)
    const [errors, setErrors] = useState<Errors>({})
    const [submitting, setSubmitting] = useState(false)

    const [profile, setProfile] = useState<Profile>({ name: '', slug: '', category: '', brandColor: '' })
    const [slugTouched, setSlugTouched] = useState(false)
    const [slugState, setSlugState] = useState<{ checking: boolean; available: boolean | null; reason: string | null }>({ checking: false, available: null, reason: null })
    const [logo, setLogo] = useState<UploadValue | null>(null)
    const [business, setBusiness] = useState<Business>({
        legalBusinessName: '', businessType: '', registeredAddress: '', gstNumber: '', panNumber: '', ownerName: '', ownerPhone: '',
    })
    const [docs, setDocs] = useState<Partial<Record<KycDocumentType, UploadValue>>>({})
    const [acceptTerms, setAcceptTerms] = useState(false)

    // Load options + any existing application (re-submission after rejection)
    useEffect(() => {
        Promise.all([sellerPortalApi.meta(), sellerPortalApi.getApplication()])
            .then(([m, app]) => {
                const a = app.data
                if (a && a.kycStatus !== 'REJECTED') {
                    navigate(a.status === 'ACTIVE' ? '/dashboard' : '/application', { replace: true })
                    return
                }
                setMeta(m.data)
                setExisting(a)
                if (a) {
                    setProfile({ name: a.name, slug: a.slug, category: a.category, brandColor: a.brandColor })
                    setSlugTouched(true)
                    const bd = a.businessDetails
                    if (bd) setBusiness({
                        legalBusinessName: bd.legalBusinessName, businessType: bd.businessType, registeredAddress: bd.registeredAddress,
                        gstNumber: bd.gstNumber ?? '', panNumber: bd.panNumber ?? '', ownerName: bd.contactPersonName, ownerPhone: bd.contactPersonMobile,
                    })
                } else {
                    setProfile(p => ({ ...p, brandColor: m.data.brandColors[0] }))
                }
            })
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load the application form')))
            .finally(() => setLoading(false))
    }, [navigate])

    // Contact person defaults to the account holder
    useEffect(() => {
        if (user && !existing) setBusiness(b => ({ ...b, ownerName: b.ownerName || user.fullName || '', ownerPhone: b.ownerPhone || user.phone || '' }))
    }, [user, existing])

    // Debounced unique page-URL check (own current URL is fine when re-submitting)
    const slugReq = useRef(0)
    useEffect(() => {
        const slug = profile.slug
        if (existing && slug === existing.slug) { setSlugState({ checking: false, available: true, reason: null }); return }
        if (!slug || !SLUG.test(slug) || slug.length < 3) { setSlugState({ checking: false, available: null, reason: null }); return }
        const id = ++slugReq.current
        setSlugState(s => ({ ...s, checking: true }))
        const t = setTimeout(() => {
            sellerPortalApi.slugAvailability(slug)
                .then(res => id === slugReq.current && setSlugState({ checking: false, available: res.data.available, reason: res.data.reason }))
                .catch(() => id === slugReq.current && setSlugState({ checking: false, available: null, reason: null }))
        }, 400)
        return () => clearTimeout(t)
    }, [profile.slug, existing])

    const category = meta?.categories.find(c => c.key === profile.category)
    const requiredDocs = useMemo(() => (meta?.kycDocuments ?? []).filter(d => !d.fssaiOnly || category?.requiresFssai), [meta, category])
    const pageBase = displayUrl(meta?.sellerPageBase ?? '')

    const setP = (k: keyof Profile, v: string) => { setProfile(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
    const setB = (k: keyof Business, v: string) => { setBusiness(b => ({ ...b, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

    const collect = (issues: z.core.$ZodIssue[]) => {
        const out: Errors = {}
        issues.forEach(i => { const k = String(i.path[0]); if (!out[k]) out[k] = i.message })
        return out
    }

    const validateStep = (s: number) => {
        if (s === 1) {
            const r = profileSchema.safeParse(profile)
            const errs: Errors = r.success ? {} : collect(r.error.issues)
            if (!errs.slug && slugState.available === false) errs.slug = slugState.reason ?? 'This page URL is taken'
            if (Object.values(errs).some(Boolean)) { setErrors(errs); return false }
        }
        if (s === 2) {
            const r = businessSchema.safeParse(business)
            if (!r.success) { setErrors(collect(r.error.issues)); return false }
        }
        if (s === 3) {
            const errs: Errors = {}
            requiredDocs.forEach(d => { if (!docs[d.type]) errs[`doc_${d.type}`] = `${d.label} is required` })
            if (Object.keys(errs).length) { setErrors(errs); return false }
        }
        setErrors({})
        return true
    }

    const [confirmingSlug, setConfirmingSlug] = useState(false)
    const confirmSlug = async () => {
        if (slugState.available === true && !slugState.checking) return true
        setConfirmingSlug(true)
        try {
            const res = await sellerPortalApi.slugAvailability(profile.slug)
            setSlugState({ checking: false, available: res.data.available, reason: res.data.reason })
            if (!res.data.available) { setErrors({ slug: res.data.reason ?? 'This page URL is not available' }); return false }
            return true
        } catch {
            setErrors({ slug: "Couldn't check if this URL is available — try again" }); return false
        } finally { setConfirmingSlug(false) }
    }

    const next = async () => {
        if (!validateStep(step)) return
        if (step === 1 && !(await confirmSlug())) return
        setStep(s => Math.min(LAST, s + 1))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    const back = () => { setErrors({}); setStep(s => Math.max(FIRST, s - 1)) }

    const submit = async () => {
        if (![1, 2, 3].every(validateStep)) return
        if (!acceptTerms) { setErrors({ terms: 'Please accept the seller terms to continue' }); return }
        const p = profileSchema.parse(profile)
        const b = businessSchema.parse(business)
        setSubmitting(true)
        try {
            await sellerPortalApi.submitApplication({
                business: { ...b, businessType: b.businessType as BusinessType, gstNumber: b.gstNumber || undefined, panNumber: b.panNumber || undefined },
                profile: { ...p, logoFileId: logo?.fileId },
                kyc: { mode: 'UPLOAD', documents: requiredDocs.map(d => ({ documentType: d.type, fileId: docs[d.type]!.fileId })) },
                acceptTerms: true,
            })
            await dispatch(fetchMe())
            toast.success('Application submitted for review')
            navigate('/application', { replace: true })
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Failed to submit your application')
            const field = isAxiosError<{ field?: string }>(err) ? err.response?.data?.field : undefined
            if (field === 'slug') {
                setSlugState({ checking: false, available: false, reason: message })
                setStep(1); setErrors({ slug: message })
            }
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    if (loading || !meta) {
        return (
            <>
                <ApplyStepper step={FIRST} />
                <div className='grid gap-4 rounded-2xl border bg-card p-8'>
                    <Skeleton className='h-6 w-48' />
                    <div className='grid gap-4 sm:grid-cols-2'>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-16' />)}</div>
                </div>
            </>
        )
    }

    return (
        <>
            <ApplyStepper step={step} />

            {existing?.kycStatus === 'REJECTED' && (
                <div className='mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm'>
                    <AlertTriangleIcon className='mt-0.5 size-4 shrink-0 text-destructive' />
                    <div>
                        <div className='font-semibold text-destructive'>Your previous application needs changes</div>
                        <div className='mt-0.5 text-muted-foreground'>We couldn’t verify your KYC documents. Check your details, upload clear copies and submit again.</div>
                    </div>
                </div>
            )}

            <div className='rounded-2xl border bg-card p-6 sm:p-8'>
                {step === 1 && (
                    <>
                        <h1 className='text-lg font-bold'>Seller page &amp; branding</h1>
                        <p className='mt-1 mb-6 text-sm text-muted-foreground'>
                            Customers browse one shared marketplace, not a separate site per seller — this sets your page within it and the accent color that marks your listings.
                        </p>
                        <div className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>
                            <Field label='Seller name' htmlFor='name' error={errors.name}>
                                <Input id='name' className='h-10' placeholder='Green Grocer' value={profile.name} aria-invalid={!!errors.name}
                                    onChange={e => { setP('name', e.target.value); if (!slugTouched) setP('slug', slugify(e.target.value)) }} />
                            </Field>
                            <Field label='Category' error={errors.category}
                                hint={category ? `Commission ${category.commissionRate}%${category.requiresFssai ? ' · FSSAI license required' : ''}` : undefined}>
                                <Select value={profile.category} onValueChange={v => setP('category', v)}>
                                    <SelectTrigger className='h-10! w-full' aria-invalid={!!errors.category}><SelectValue placeholder='Select category' /></SelectTrigger>
                                    <SelectContent position='popper'>
                                        {meta.categories.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label='Seller page' htmlFor='slug' error={errors.slug}
                                hint={slugState.available === false ? <span className='text-destructive'>{slugState.reason}</span>
                                    : slugState.available === true ? <span className='text-primary'>Available</span>
                                        : 'Suggested from your seller name — this is a page within the marketplace.'}>
                                <div className={cn('flex h-10 items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50', errors.slug && 'border-destructive')}>
                                    <span className='max-w-[55%] shrink-0 truncate pl-3 text-xs text-muted-foreground' title={pageBase}>{pageBase}</span>
                                    <input id='slug' className='h-full min-w-0 flex-1 bg-transparent pr-2 text-sm outline-none' placeholder='green-grocer'
                                        value={profile.slug} onChange={e => { setSlugTouched(true); setP('slug', slugify(e.target.value)) }} />
                                    <span className='pr-3'>
                                        {slugState.checking ? <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
                                            : slugState.available === true ? <CircleCheckIcon className='size-4 text-primary' />
                                                : slugState.available === false ? <CircleXIcon className='size-4 text-destructive' /> : null}
                                    </span>
                                </div>
                            </Field>
                            <Field label='Logo (optional)'>
                                <FileUploadTile kind='logo' label='Upload logo' hint='PNG, JPG or WEBP · up to 5 MB' value={logo} onChange={setLogo} disabled={submitting} />
                            </Field>
                            <div className='grid gap-1.5 sm:col-span-2'>
                                <span className='text-xs font-semibold text-muted-foreground'>Brand color</span>
                                <p className='text-xs text-muted-foreground'>Used as your seller badge and accent color on product listings — not a full site theme.</p>
                                <div role='radiogroup' aria-label='Brand color' className='mt-1 flex flex-wrap gap-2.5'>
                                    {meta.brandColors.map(hex => {
                                        const active = profile.brandColor === hex
                                        return (
                                            <button key={hex} type='button' role='radio' aria-checked={active} aria-label={hex} onClick={() => setP('brandColor', hex)}
                                                className={cn('flex size-9 cursor-pointer items-center justify-center rounded-[10px] ring-offset-2 ring-offset-card transition', active ? 'ring-2 ring-foreground' : 'hover:scale-105')}
                                                style={{ background: hex }}>
                                                {active && <CheckIcon className='size-4 text-white' />}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <>
                        <h1 className='text-lg font-bold'>Business information</h1>
                        <p className='mt-1 mb-6 text-sm text-muted-foreground'>The legal entity behind your business — used for KYC and payouts, not shown to customers.</p>
                        <div className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>
                            <Field label='Business name' htmlFor='legalBusinessName' error={errors.legalBusinessName}>
                                <Input id='legalBusinessName' className='h-10' placeholder='Green Grocer Retail Pvt Ltd' value={business.legalBusinessName}
                                    aria-invalid={!!errors.legalBusinessName} onChange={e => setB('legalBusinessName', e.target.value)} />
                            </Field>
                            <Field label='Business type' error={errors.businessType}>
                                <Select value={business.businessType} onValueChange={v => setB('businessType', v)}>
                                    <SelectTrigger className='h-10! w-full' aria-invalid={!!errors.businessType}><SelectValue placeholder='Select business type' /></SelectTrigger>
                                    <SelectContent position='popper'>
                                        {meta.businessTypes.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label='Registered address' htmlFor='registeredAddress' error={errors.registeredAddress} className='sm:col-span-2'>
                                <Input id='registeredAddress' className='h-10' placeholder='123 MG Road, Bengaluru' value={business.registeredAddress}
                                    aria-invalid={!!errors.registeredAddress} onChange={e => setB('registeredAddress', e.target.value)} />
                            </Field>
                            <Field label='GST number (optional)' htmlFor='gstNumber' error={errors.gstNumber}>
                                <Input id='gstNumber' className='h-10 uppercase placeholder:normal-case' maxLength={15} placeholder='29ABCDE1234F1Z5'
                                    value={business.gstNumber} aria-invalid={!!errors.gstNumber} onChange={e => setB('gstNumber', e.target.value.toUpperCase())} />
                            </Field>
                            <Field label='PAN number (optional)' htmlFor='panNumber' error={errors.panNumber}>
                                <Input id='panNumber' className='h-10 uppercase placeholder:normal-case' maxLength={10} placeholder='ABCDE1234F'
                                    value={business.panNumber} aria-invalid={!!errors.panNumber} onChange={e => setB('panNumber', e.target.value.toUpperCase())} />
                            </Field>
                            <Field label='Contact person — name' htmlFor='ownerName' error={errors.ownerName}>
                                <Input id='ownerName' className='h-10' value={business.ownerName} aria-invalid={!!errors.ownerName} onChange={e => setB('ownerName', e.target.value)} />
                            </Field>
                            <Field label='Contact person — phone' htmlFor='ownerPhone' error={errors.ownerPhone}>
                                <Input id='ownerPhone' type='tel' className='h-10' value={business.ownerPhone} aria-invalid={!!errors.ownerPhone} onChange={e => setB('ownerPhone', e.target.value)} />
                            </Field>
                        </div>
                    </>
                )}

                {step === 3 && (
                    <>
                        <h1 className='text-lg font-bold'>KYC documents</h1>
                        <p className='mt-1 mb-6 text-sm text-muted-foreground'>
                            Upload verification documents for the platform team to review — each is queued for review once you submit.
                        </p>
                        <div className='grid gap-4 sm:grid-cols-2'>
                            {requiredDocs.map(d => (
                                <FileUploadTile key={d.type} kind='kyc' label={d.label} required
                                    hint={d.fssaiOnly ? 'Required for grocery & food sellers · PDF, JPG or PNG' : 'PDF, JPG or PNG · up to 5 MB'}
                                    value={docs[d.type] ?? null}
                                    onChange={v => { setDocs(prev => ({ ...prev, [d.type]: v ?? undefined })); setErrors(e => ({ ...e, [`doc_${d.type}`]: undefined })) }}
                                    error={errors[`doc_${d.type}`]} disabled={submitting} />
                            ))}
                        </div>
                        <p className='mt-4 flex items-center gap-1.5 text-xs text-muted-foreground'>
                            <InfoIcon className='size-3.5' /> Documents are stored privately and only viewable by the platform team.
                        </p>
                    </>
                )}

                {step === 4 && (
                    <>
                        <h1 className='mb-3 text-lg font-bold'>Review &amp; submit</h1>
                        <ReviewRow label='Account email'>{user?.email}</ReviewRow>
                        <ReviewRow label='Seller name'>
                            <span className='inline-flex items-center gap-2'>
                                {logo?.url && <img src={logo.url} alt='' className='size-6 rounded object-cover' />}{profile.name}
                            </span>
                        </ReviewRow>
                        <ReviewRow label='Seller page'>{pageBase}{profile.slug}</ReviewRow>
                        <ReviewRow label='Business name'>{business.legalBusinessName}</ReviewRow>
                        <ReviewRow label='Category'>{category?.label}</ReviewRow>
                        <ReviewRow label='Commission rate'>{category?.commissionRate}% <span className='font-normal text-muted-foreground'>(category default)</span></ReviewRow>
                        <ReviewRow label='KYC documents'>{requiredDocs.filter(d => docs[d.type]).length} of {requiredDocs.length} uploaded · queued for review</ReviewRow>
                        <ReviewRow label='Brand color'><span className='inline-block size-5 rounded-md align-middle' style={{ background: profile.brandColor }} /></ReviewRow>

                        <label className='mt-5 flex cursor-pointer items-start gap-3 rounded-xl border bg-muted/30 p-4 text-sm'>
                            <Checkbox checked={acceptTerms} onCheckedChange={v => { setAcceptTerms(v === true); setErrors({}) }} className='mt-0.5' />
                            <span className='leading-relaxed'>
                                I agree to the platform’s seller terms. I understand my application goes to the platform team for KYC review —
                                most applications are reviewed within 2 business days, and I’ll get an email once approved.
                            </span>
                        </label>
                        {errors.terms && <p className='mt-2 text-xs text-destructive'>{errors.terms}</p>}
                    </>
                )}
            </div>

            <div className='mt-6 flex justify-between'>
                <Button type='button' variant='outline' className={cn('h-11 px-6', step === FIRST && 'invisible')} onClick={back} disabled={submitting}>Back</Button>
                {step < LAST ? (
                    <Button type='button' className='h-11 px-7' onClick={next} disabled={confirmingSlug || (step === 1 && slugState.checking)}>
                        {confirmingSlug && <Spinner />} Continue
                    </Button>
                ) : (
                    <Button type='button' className='h-11 min-w-40 px-7' onClick={submit} disabled={submitting}>
                        {submitting && <Spinner />} Submit for review
                    </Button>
                )}
            </div>
        </>
    )
}
