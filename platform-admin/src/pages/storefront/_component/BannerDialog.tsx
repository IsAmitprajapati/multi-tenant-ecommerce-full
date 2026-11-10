import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImageIcon, UploadCloudIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { Progress } from '@/components/ui/progress'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { uploadToImageKit } from '@/lib/imagekit-upload'
import { storefrontApi, type HomeBanner } from '@/api/storefront'

const LINK_RE = /^(\/\S*|https?:\/\/\S+)$/

/** <input type="datetime-local"> wants local time without a zone */
const toLocalInput = (iso: string | null) => {
    if (!iso) return ''
    const d = new Date(iso)
    return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: React.ReactNode }) {
    return (
        <div className='grid gap-1.5'>
            <Label className='text-xs font-semibold text-muted-foreground'>{label}</Label>
            {children}
            {error ? <p className='text-xs text-destructive'>{error}</p> : hint && <p className='text-xs text-muted-foreground'>{hint}</p>}
        </div>
    )
}

export default function BannerDialog({ banner, open, onOpenChange, onSaved }: {
    banner: HomeBanner | null
    open: boolean
    onOpenChange: (o: boolean) => void
    onSaved: () => void
}) {
    const fileInput = useRef<HTMLInputElement>(null)
    // Remounted (keyed) each time it opens, so state starts from the banner being edited
    const [form, setForm] = useState(() => ({
        title: banner?.title ?? '',
        subtitle: banner?.subtitle ?? '',
        ctaLabel: banner?.ctaLabel ?? '',
        linkUrl: banner?.linkUrl ?? '',
        isActive: banner?.isActive ?? true,
        startsAt: toLocalInput(banner?.startsAt ?? null),
        endsAt: toLocalInput(banner?.endsAt ?? null),
    }))
    const [image, setImage] = useState<{ fileId: string; url: string } | null>(banner ? { fileId: banner.imageFileId, url: banner.imageUrl } : null)
    const [progress, setProgress] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

    const pickFile = async (file: File | undefined) => {
        if (!file) return
        setProgress(0)
        try {
            const up = await uploadToImageKit(storefrontApi.uploadAuth, file, setProgress)
            setImage({ fileId: up.fileId, url: up.url })
            setErrors(e => ({ ...e, image: '' }))
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setProgress(null)
            if (fileInput.current) fileInput.current.value = ''
        }
    }

    const save = async () => {
        const e: Record<string, string> = {}
        if (!image) e.image = 'Upload a banner image'
        if (form.title.trim().length < 2) e.title = 'Enter a title (at least 2 characters)'
        if (form.linkUrl.trim() && !LINK_RE.test(form.linkUrl.trim())) e.linkUrl = 'Start with / (e.g. /category/grocery) or https://'
        if (form.ctaLabel.trim() && !form.linkUrl.trim()) e.linkUrl = 'Add a link for the button'
        if (form.startsAt && form.endsAt && new Date(form.endsAt) <= new Date(form.startsAt)) e.endsAt = 'End must be after start'
        setErrors(e)
        if (Object.keys(e).length) return

        const payload = {
            title: form.title.trim(),
            subtitle: form.subtitle.trim() || null,
            ctaLabel: form.ctaLabel.trim() || null,
            linkUrl: form.linkUrl.trim() || null,
            imageFileId: image!.fileId,
            isActive: form.isActive,
            startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
            endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
        }
        setSaving(true)
        try {
            const res = banner ? await storefrontApi.updateBanner(banner.id, payload) : await storefrontApi.createBanner(payload)
            toast.success(res.message)
            onSaved()
            onOpenChange(false)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not save the banner'))
        } finally { setSaving(false) }
    }

    const uploading = progress !== null

    return (
        <Dialog open={open} onOpenChange={o => !saving && !uploading && onOpenChange(o)}>
            <DialogContent className='max-h-[92vh] overflow-y-auto sm:max-w-xl'>
                <DialogHeader>
                    <DialogTitle>{banner ? 'Edit banner' : 'Add banner'}</DialogTitle>
                    <DialogDescription>Shown at the top of the customer home page. Wide images work best (about 1600 × 500).</DialogDescription>
                </DialogHeader>

                <div className='grid gap-4'>
                    <div className='grid gap-1.5'>
                        <Label className='text-xs font-semibold text-muted-foreground'>Image</Label>
                        <button
                            type='button'
                            onClick={() => fileInput.current?.click()}
                            disabled={uploading}
                            aria-invalid={!!errors.image}
                            className='group relative flex aspect-[16/5] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 aria-invalid:border-destructive'
                        >
                            {image
                                ? <img src={image.url} alt='' className='size-full object-cover' />
                                : <span className='flex flex-col items-center gap-1 text-sm text-muted-foreground'><ImageIcon className='size-6' /> Click to upload (PNG, JPG, WebP · max 5 MB)</span>}
                            {image && !uploading && (
                                <span className='absolute inset-0 hidden items-center justify-center gap-2 bg-black/45 text-sm font-semibold text-white group-hover:flex'>
                                    <UploadCloudIcon className='size-4' /> Replace image
                                </span>
                            )}
                            {uploading && (
                                <span className='absolute inset-x-6 bottom-4 grid gap-1 rounded-md bg-background/90 p-2 text-xs'>
                                    Uploading… {progress}%
                                    <Progress value={progress} />
                                </span>
                            )}
                        </button>
                        <input ref={fileInput} type='file' accept='image/png,image/jpeg,image/webp' className='hidden' onChange={e => pickFile(e.target.files?.[0])} />
                        {errors.image && <p className='text-xs text-destructive'>{errors.image}</p>}
                    </div>

                    <Field label='Title' error={errors.title}>
                        <Input className='h-10' maxLength={100} placeholder='e.g. Monsoon grocery sale' value={form.title} aria-invalid={!!errors.title} onChange={e => set('title', e.target.value)} />
                    </Field>
                    <Field label='Subtitle (optional)'>
                        <Input className='h-10' maxLength={200} placeholder='e.g. Up to 40% off across grocery, fashion & electronics' value={form.subtitle} onChange={e => set('subtitle', e.target.value)} />
                    </Field>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <Field label='Button text (optional)'>
                            <Input className='h-10' maxLength={30} placeholder='Shop the deal' value={form.ctaLabel} onChange={e => set('ctaLabel', e.target.value)} />
                        </Field>
                        <Field label='Link (optional)' error={errors.linkUrl} hint='e.g. /category/grocery'>
                            <Input className='h-10' maxLength={500} placeholder='/category/grocery' value={form.linkUrl} aria-invalid={!!errors.linkUrl} onChange={e => set('linkUrl', e.target.value)} />
                        </Field>
                    </div>
                    <div className='grid gap-4 sm:grid-cols-2'>
                        <Field label='Show from (optional)'>
                            <Input type='datetime-local' className='h-10' value={form.startsAt} onChange={e => set('startsAt', e.target.value)} />
                        </Field>
                        <Field label='Show until (optional)' error={errors.endsAt}>
                            <Input type='datetime-local' className='h-10' value={form.endsAt} aria-invalid={!!errors.endsAt} onChange={e => set('endsAt', e.target.value)} />
                        </Field>
                    </div>
                    <label className='flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3'>
                        <span>
                            <span className='block text-sm font-semibold'>Active</span>
                            <span className='block text-xs text-muted-foreground'>Hidden banners stay here but aren’t shown to customers.</span>
                        </span>
                        <Switch checked={form.isActive} onCheckedChange={v => set('isActive', v)} />
                    </label>
                </div>

                <DialogFooter>
                    <Button variant='outline' className='cursor-pointer' onClick={() => onOpenChange(false)} disabled={saving || uploading}>Cancel</Button>
                    <Button className='min-w-24 cursor-pointer' onClick={save} disabled={saving || uploading}>{saving && <Spinner />} Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
