import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { z } from 'zod'
import { CheckIcon, CircleCheckIcon, CircleXIcon, InfoIcon, Loader2Icon } from 'lucide-react'
import PageHeader, { scrollPageToTop } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn, displayUrl } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { sellerApi, type BusinessType, type KycDocumentType, type OnboardSellerPayload, type SellerMeta } from '@/api/seller'
import FileUploadTile, { type UploadValue } from './_component/FileUploadTile'

const SELLERS_PATH = '/dashboard/sellers'
const STEPS = ['Business info', 'Seller page', 'KYC', 'Review'] as const

const GST = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
const PAN = /^[A-Z]{5}\d{4}[A-Z]$/
const PHONE = /^\+?[1-9]\d{9,14}$/
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const businessSchema = z.object({
    legalBusinessName: z.string().trim().min(2, 'Business name is required'),
    businessType: z.string().min(1, 'Select a business type'),
    registeredAddress: z.string().trim().min(5, 'Registered address is required'),
    gstNumber: z.string().trim().toUpperCase().refine(v => !v || GST.test(v), 'GST number is not valid (e.g. 29ABCDE1234F1Z5)'),
    panNumber: z.string().trim().toUpperCase().refine(v => !v || PAN.test(v), 'PAN number is not valid (e.g. ABCDE1234F)'),
    ownerName: z.string().trim().min(2, 'Owner name is required'),
    ownerPhone: z.string().transform(v => v.replace(/[\s-]/g, '')).refine(v => PHONE.test(v), 'Enter a valid phone number'),
    ownerEmail: z.string().trim().toLowerCase().email('Enter a valid email'),
})

const profileSchema = z.object({
    name: z.string().trim().min(2, 'Seller name is required'),
    slug: z.string().min(3, 'Use at least 3 characters').max(50).regex(SLUG, 'Only lowercase letters, numbers and hyphens'),
    category: z.string().min(1, 'Select a category'),
    brandColor: z.string().min(1),
})

type Business = z.input<typeof businessSchema>
type Profile = z.input<typeof profileSchema>
type Errors = Record<string, string | undefined>

const slugify = (v: string) =>
    v.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50)

function Field({ label, htmlFor, error, hint, className, children }: {
    label: string; htmlFor?: string; error?: string; hint?: string; className?: string; children: React.ReactNode
}) {
    return (
        <div className={cn('grid content-start gap-1.5', className)}>
            <Label htmlFor={htmlFor} className='text-xs font-semibold text-muted-foreground'>{label}</Label>
            {children}
            {error ? <p className='text-xs text-destructive'>{error}</p> : hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
        </div>
    )
}

function Stepper({ step }: { step: number }) {
    return (
        <ol className='mx-auto flex w-full max-w-3xl items-start'>
            {STEPS.map((label, i) => {
                const done = i < step
                const current = i === step
                return (
                    <li key={label} className='flex flex-1 items-start last:flex-none'>
                        <div className='flex flex-col items-center gap-2'>
                            <span
                                aria-current={current ? 'step' : undefined}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors',
                                    done && 'border-primary bg-primary text-primary-foreground',
                                    current && 'border-primary bg-primary/10 text-primary',
                                    !done && !current && 'border-border bg-muted text-muted-foreground'
                                )}
                            >
                                {done ? <CheckIcon className='size-4' /> : i + 1}
                            </span>
                            <span className={cn('text-xs font-semibold whitespace-nowrap', i <= step ? 'text-foreground' : 'text-muted-foreground')}>
                                {label}
                            </span>
                        </div>
                        {i < STEPS.length - 1 && (
                            <div className={cn('mx-2 mt-4 h-0.5 flex-1 rounded-full', done ? 'bg-primary' : 'bg-border')} />
                        )}
                    </li>
                )
            })}
        </ol>
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

const OnboardSellerPage = () => {
    const navigate = useNavigate()
    const [meta, setMeta] = useState<SellerMeta | null>(null)
    const [step, setStep] = useState(0)
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<Errors>({})

    const [business, setBusiness] = useState<Business>({
        legalBusinessName: '', businessType: '', registeredAddress: '', gstNumber: '', panNumber: '',
        ownerName: '', ownerPhone: '', ownerEmail: '',
    })
    const [profile, setProfile] = useState<Profile>({ name: '', slug: '', category: '', brandColor: '' })
    const [slugTouched, setSlugTouched] = useState(false)
    const [slugState, setSlugState] = useState<{ checking: boolean; available: boolean | null; reason: string | null }>({ checking: false, available: null, reason: null })
    const [logo, setLogo] = useState<UploadValue | null>(null)
    const [kycMode, setKycMode] = useState<'UPLOAD' | 'OFFLINE'>('UPLOAD')
    const [docs, setDocs] = useState<Partial<Record<KycDocumentType, UploadValue>>>({})
    const [offlineReference, setOfflineReference] = useState('')

    useEffect(() => {
        sellerApi.meta()
            .then(res => {
                setMeta(res.data)
                setProfile(p => ({ ...p, brandColor: p.brandColor || res.data.brandColors[0] }))
            })
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load onboarding options')))
    }, [])

    // Debounced page-URL availability check
    const slugReq = useRef(0)
    useEffect(() => {
        const slug = profile.slug
        if (!slug || !SLUG.test(slug) || slug.length < 3) {
            setSlugState({ checking: false, available: null, reason: null })
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
    }, [profile.slug])

    const category = meta?.categories.find(c => c.key === profile.category)
    const requiredDocs = useMemo(
        () => (meta?.kycDocuments ?? []).filter(d => !d.fssaiOnly || category?.requiresFssai),
        [meta, category]
    )
    const uploadingBlocked = submitting

    const setB = (k: keyof Business, v: string) => { setBusiness(b => ({ ...b, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }
    const setP = (k: keyof Profile, v: string) => { setProfile(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

    const collect = (issues: z.core.$ZodIssue[]) => {
        const out: Errors = {}
        issues.forEach(i => { const k = String(i.path[0]); if (!out[k]) out[k] = i.message })
        return out
    }

    const validateStep = (s: number): boolean => {
        if (s === 0) {
            const r = businessSchema.safeParse(business)
            if (!r.success) { setErrors(collect(r.error.issues)); return false }
        }
        if (s === 1) {
            const r = profileSchema.safeParse(profile)
            const errs: Errors = r.success ? {} : collect(r.error.issues)
            if (!errs.slug && slugState.available === false) errs.slug = slugState.reason ?? 'This page URL is taken'
            if (Object.values(errs).some(Boolean)) { setErrors(errs); return false }
        }
        if (s === 2) {
            if (kycMode === 'UPLOAD') {
                const errs: Errors = {}
                requiredDocs.forEach(d => { if (!docs[d.type]) errs[`doc_${d.type}`] = `${d.label} is required` })
                if (Object.keys(errs).length) { setErrors(errs); return false }
            } else if (offlineReference.trim().length < 3) {
                setErrors({ offlineReference: 'Enter the verification reference number' }); return false
            }
        }
        setErrors({})
        return true
    }

    const [confirmingSlug, setConfirmingSlug] = useState(false)

    /** The page URL must be confirmed unique by the server before leaving step 2. */
    const confirmSlugAvailable = async (): Promise<boolean> => {
        if (slugState.available === true && !slugState.checking) return true
        setConfirmingSlug(true)
        try {
            const res = await sellerApi.slugAvailability(profile.slug)
            setSlugState({ checking: false, available: res.data.available, reason: res.data.reason })
            if (!res.data.available) {
                setErrors(e => ({ ...e, slug: res.data.reason ?? 'This page URL is not available' }))
                return false
            }
            return true
        } catch {
            setErrors(e => ({ ...e, slug: "Couldn't check if this URL is available — try again" }))
            return false
        } finally {
            setConfirmingSlug(false)
        }
    }

    const next = async () => {
        if (!validateStep(step)) return
        if (step === 1 && !(await confirmSlugAvailable())) return
        setStep(s => Math.min(STEPS.length - 1, s + 1))
        scrollPageToTop()
    }
    const back = () => { setErrors({}); setStep(s => Math.max(0, s - 1)) }

    const submit = async () => {
        if (![0, 1, 2].every(validateStep)) return
        const b = businessSchema.parse(business)
        const p = profileSchema.parse(profile)
        const payload: OnboardSellerPayload = {
            business: {
                ...b,
                businessType: b.businessType as BusinessType,
                gstNumber: b.gstNumber || undefined,
                panNumber: b.panNumber || undefined,
            },
            profile: { ...p, logoFileId: logo?.fileId },
            kyc: kycMode === 'UPLOAD'
                ? { mode: 'UPLOAD', documents: requiredDocs.map(d => ({ documentType: d.type, fileId: docs[d.type]!.fileId })) }
                : { mode: 'OFFLINE', offlineReference: offlineReference.trim() },
        }

        setSubmitting(true)
        try {
            const res = await sellerApi.onboard(payload)
            if (res.data.inviteSent) toast.success(res.message ?? 'Seller onboarded')
            else toast.warning(res.message ?? 'Seller onboarded, but the invite email could not be sent')
            navigate(SELLERS_PATH)
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Failed to onboard seller')
            const field = isAxiosError<{ field?: string }>(err) ? err.response?.data?.field : undefined
            // Unique-value conflicts: jump back to the step with that field and show it inline
            if (field === 'slug') {
                setSlugState({ checking: false, available: false, reason: message })
                setStep(1)
                setErrors({ slug: message })
                scrollPageToTop()
            } else if (field === 'ownerEmail') {
                setStep(0)
                setErrors({ ownerEmail: message })
                scrollPageToTop()
            }
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    const businessTypeLabel = meta?.businessTypes.find(t => t.value === business.businessType)?.label
    // From CUSTOMER_STORE in the backend .env
    const pageBase = displayUrl(meta?.sellerPageBase ?? '')

    return (
        <div className='pb-10'>
            <PageHeader title='Onboard a new seller' description='Create a seller account on their behalf. It goes live immediately.' back>
                <Stepper step={step} />
            </PageHeader>

            <div className='mx-auto w-full max-w-3xl'>

                <div className='rounded-2xl border bg-card p-6 sm:p-8'>
                    {!meta ? (
                        <div className='grid gap-4'>
                            <Skeleton className='h-6 w-48' />
                            <div className='grid gap-4 sm:grid-cols-2'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-16' />)}</div>
                        </div>
                    ) : step === 0 ? (
                        <>
                            <h2 className='text-lg font-bold'>Business information</h2>
                            <p className='mt-1 mb-6 text-sm text-muted-foreground'>
                                Fill this in on the seller's behalf — they'll set their own password from the invite email at the end.
                            </p>
                            <div className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>
                                <Field label='Business name' htmlFor='legalBusinessName' error={errors.legalBusinessName}>
                                    <Input id='legalBusinessName' className='h-10' placeholder='Green Grocer Retail Pvt Ltd'
                                        value={business.legalBusinessName} onChange={e => setB('legalBusinessName', e.target.value)} aria-invalid={!!errors.legalBusinessName} />
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
                                    <Input id='registeredAddress' className='h-10' placeholder='123 MG Road, Bengaluru'
                                        value={business.registeredAddress} onChange={e => setB('registeredAddress', e.target.value)} aria-invalid={!!errors.registeredAddress} />
                                </Field>
                                <Field label='GST number (optional)' htmlFor='gstNumber' error={errors.gstNumber}>
                                    <Input id='gstNumber' className='h-10 uppercase placeholder:normal-case' placeholder='29ABCDE1234F1Z5' maxLength={15}
                                        value={business.gstNumber} onChange={e => setB('gstNumber', e.target.value.toUpperCase())} aria-invalid={!!errors.gstNumber} />
                                </Field>
                                <Field label='PAN number (optional)' htmlFor='panNumber' error={errors.panNumber}>
                                    <Input id='panNumber' className='h-10 uppercase placeholder:normal-case' placeholder='ABCDE1234F' maxLength={10}
                                        value={business.panNumber} onChange={e => setB('panNumber', e.target.value.toUpperCase())} aria-invalid={!!errors.panNumber} />
                                </Field>
                                <Field label='Owner name' htmlFor='ownerName' error={errors.ownerName}>
                                    <Input id='ownerName' className='h-10' placeholder='Ravi Kumar'
                                        value={business.ownerName} onChange={e => setB('ownerName', e.target.value)} aria-invalid={!!errors.ownerName} />
                                </Field>
                                <Field label='Owner phone' htmlFor='ownerPhone' error={errors.ownerPhone}>
                                    <Input id='ownerPhone' className='h-10' type='tel' placeholder='+91 98765 43210'
                                        value={business.ownerPhone} onChange={e => setB('ownerPhone', e.target.value)} aria-invalid={!!errors.ownerPhone} />
                                </Field>
                                <Field label='Owner email' htmlFor='ownerEmail' error={errors.ownerEmail} className='sm:col-span-2'
                                    hint='The invite link to set a dashboard password goes here once the seller is created.'>
                                    <Input id='ownerEmail' className='h-10' type='email' placeholder='owner@business.com'
                                        value={business.ownerEmail} onChange={e => setB('ownerEmail', e.target.value)} aria-invalid={!!errors.ownerEmail} />
                                </Field>
                            </div>
                        </>
                    ) : step === 1 ? (
                        <>
                            <h2 className='text-lg font-bold'>Seller page &amp; branding</h2>
                            <p className='mt-1 mb-6 text-sm text-muted-foreground'>
                                This sets the seller's page within the shared marketplace, and the accent color that marks their listings — not a separate site.
                            </p>
                            <div className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>
                                <Field label='Seller name' htmlFor='sellerName' error={errors.name}>
                                    <Input id='sellerName' className='h-10' placeholder='Green Grocer' value={profile.name}
                                        aria-invalid={!!errors.name}
                                        onChange={e => {
                                            setP('name', e.target.value)
                                            if (!slugTouched) setP('slug', slugify(e.target.value))
                                        }} />
                                </Field>
                                <Field label='Category' error={errors.category}
                                    hint={category ? `Default commission ${category.commissionRate}%${category.requiresFssai ? ' · FSSAI license required' : ''}` : undefined}>
                                    <Select value={profile.category} onValueChange={v => setP('category', v)}>
                                        <SelectTrigger className='h-10! w-full' aria-invalid={!!errors.category}><SelectValue placeholder='Select category' /></SelectTrigger>
                                        <SelectContent position='popper'>
                                            {meta.categories.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label='Seller page' htmlFor='slug' error={errors.slug}>
                                    <div className={cn(
                                        'flex h-10 items-center overflow-hidden rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
                                        errors.slug && 'border-destructive'
                                    )}>
                                        <span className='max-w-[55%] shrink-0 truncate pl-3 text-sm text-muted-foreground' title={pageBase}>{pageBase}</span>
                                        <input id='slug' className='h-full min-w-0 flex-1 bg-transparent pr-2 text-sm outline-none'
                                            value={profile.slug} placeholder='green-grocer'
                                            onChange={e => { setSlugTouched(true); setP('slug', slugify(e.target.value)) }} />
                                        <span className='pr-3'>
                                            {slugState.checking ? <Loader2Icon className='size-4 animate-spin text-muted-foreground' />
                                                : slugState.available === true ? <CircleCheckIcon className='size-4 text-primary' />
                                                    : slugState.available === false ? <CircleXIcon className='size-4 text-destructive' /> : null}
                                        </span>
                                    </div>
                                    {!errors.slug && slugState.available === false && <p className='text-xs text-destructive'>{slugState.reason}</p>}
                                    {!errors.slug && slugState.available === true && <p className='text-xs text-primary'>Available</p>}
                                </Field>
                                <Field label='Logo (optional)'>
                                    <FileUploadTile kind='logo' label='Upload logo' hint='PNG, JPG or WEBP · up to 5 MB'
                                        value={logo} onChange={setLogo} disabled={uploadingBlocked} />
                                </Field>
                                <div className='grid gap-1.5 sm:col-span-2'>
                                    <span className='text-xs font-semibold text-muted-foreground'>Brand color</span>
                                    <p className='text-xs text-muted-foreground'>Used as the seller's badge and accent color on product listings — not a full site theme.</p>
                                    <div role='radiogroup' aria-label='Brand color' className='mt-1 flex flex-wrap gap-2.5'>
                                        {meta.brandColors.map(hex => {
                                            const active = profile.brandColor === hex
                                            return (
                                                <button key={hex} type='button' role='radio' aria-checked={active} aria-label={hex}
                                                    onClick={() => setP('brandColor', hex)}
                                                    className={cn(
                                                        'flex size-9 cursor-pointer items-center justify-center rounded-[10px] ring-offset-2 ring-offset-card transition',
                                                        active ? 'ring-2 ring-foreground' : 'hover:scale-105'
                                                    )}
                                                    style={{ background: hex }}>
                                                    {active && <CheckIcon className='size-4 text-white' />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : step === 2 ? (
                        <>
                            <h2 className='text-lg font-bold'>KYC</h2>
                            <p className='mt-1 mb-5 text-sm text-muted-foreground'>
                                Upload documents on the seller's behalf, or mark them as verified offline to skip the review queue.
                            </p>
                            <div role='tablist' className='mb-6 inline-flex gap-1 rounded-lg bg-muted p-1'>
                                {([['UPLOAD', 'Upload documents'], ['OFFLINE', 'Mark as verified offline']] as const).map(([mode, label]) => (
                                    <button key={mode} type='button' role='tab' aria-selected={kycMode === mode}
                                        onClick={() => { setKycMode(mode); setErrors({}) }}
                                        className={cn(
                                            'cursor-pointer rounded-md px-3.5 py-1.5 text-sm font-semibold transition-colors',
                                            kycMode === mode ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'
                                        )}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {kycMode === 'UPLOAD' ? (
                                <>
                                    <div className='grid gap-4 sm:grid-cols-2'>
                                        {requiredDocs.map(d => (
                                            <FileUploadTile key={d.type} kind='kyc' label={d.label} required
                                                hint={d.fssaiOnly ? 'Required for grocery & food sellers · PDF, JPG or PNG' : 'PDF, JPG or PNG · up to 5 MB'}
                                                value={docs[d.type] ?? null}
                                                onChange={v => { setDocs(prev => ({ ...prev, [d.type]: v ?? undefined })); setErrors(e => ({ ...e, [`doc_${d.type}`]: undefined })) }}
                                                error={errors[`doc_${d.type}`]}
                                                disabled={uploadingBlocked} />
                                        ))}
                                    </div>
                                    <p className='mt-4 flex items-center gap-1.5 text-xs text-muted-foreground'>
                                        <InfoIcon className='size-3.5' /> Documents are stored privately and only viewable by platform admins.
                                    </p>
                                </>
                            ) : (
                                <Field label='Reference number' htmlFor='offlineRef' error={errors.offlineReference} className='max-w-sm'
                                    hint="Use this when the seller's documents were verified in person or through another process — the seller skips the document review queue.">
                                    <Input id='offlineRef' className='h-10' placeholder='e.g. physical-verification ticket ID'
                                        value={offlineReference} aria-invalid={!!errors.offlineReference}
                                        onChange={e => { setOfflineReference(e.target.value); setErrors({}) }} />
                                </Field>
                            )}
                        </>
                    ) : (
                        <>
                            <h2 className='mb-3 text-lg font-bold'>Review &amp; create</h2>
                            <div>
                                <ReviewRow label='Business name'>{business.legalBusinessName}</ReviewRow>
                                <ReviewRow label='Business type'>{businessTypeLabel}</ReviewRow>
                                <ReviewRow label='Owner'>{business.ownerName} · {business.ownerEmail}</ReviewRow>
                                <ReviewRow label='Seller name'>
                                    <span className='inline-flex items-center gap-2'>
                                        {logo?.url && <img src={logo.url} alt='' className='size-6 rounded object-cover' />}
                                        {profile.name}
                                    </span>
                                </ReviewRow>
                                <ReviewRow label='Seller page'>{pageBase}{profile.slug}</ReviewRow>
                                <ReviewRow label='Category'>{category?.label}</ReviewRow>
                                <ReviewRow label='KYC'>
                                    {kycMode === 'UPLOAD' ? `${requiredDocs.length} documents uploaded · queued for review` : `Verified offline · ${offlineReference}`}
                                </ReviewRow>
                                <ReviewRow label='Commission rate'>
                                    {category?.commissionRate}% <span className='font-normal text-muted-foreground'>(category default, adjustable later)</span>
                                </ReviewRow>
                                <ReviewRow label='Brand color'>
                                    <span className='inline-block size-5 rounded-md align-middle' style={{ background: profile.brandColor }} />
                                </ReviewRow>
                            </div>
                            <div className='mt-5 rounded-xl bg-primary/10 px-4 py-3.5 text-sm leading-relaxed text-primary'>
                                <strong>This seller goes live immediately</strong> — unlike self-serve signups, admin-created sellers skip pending review.
                                An invite email goes to the owner with a link to set their own password and reach their dashboard.
                            </div>
                        </>
                    )}
                </div>

                <div className='mt-6 flex justify-between'>
                    <Button type='button' variant='outline' className={cn('h-11 cursor-pointer px-6', step === 0 && 'invisible')}
                        onClick={back} disabled={submitting}>
                        Back
                    </Button>
                    {step < STEPS.length - 1 ? (
                        <Button type='button' className='h-11 cursor-pointer px-7' onClick={next} disabled={!meta || confirmingSlug || (step === 1 && slugState.checking)}>
                            {confirmingSlug && <Spinner />}
                            Continue
                        </Button>
                    ) : (
                        <Button type='button' className='h-11 min-w-36 cursor-pointer px-7' onClick={submit} disabled={submitting}>
                            {submitting && <Spinner />}
                            Create seller
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default OnboardSellerPage
