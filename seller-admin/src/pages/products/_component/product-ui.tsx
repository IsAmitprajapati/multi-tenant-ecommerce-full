import { useRef, useState } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, ImagePlusIcon, Loader2Icon, StarIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { uploadToImageKit } from '@/lib/imagekit-upload'
import type { ProductStatus, StockStatus } from '@/api/products'

export const inr = (n: number | null | undefined) =>
    n == null ? '—' : `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

const STOCK: Record<StockStatus, { label: string; className: string }> = {
    IN: { label: 'In stock', className: 'bg-primary/10 text-primary' },
    LOW: { label: 'Low stock', className: 'bg-amber-100 text-amber-800' },
    OUT: { label: 'Out of stock', className: 'bg-destructive/10 text-destructive' },
}

export function StockPill({ status }: { status: StockStatus }) {
    const s = STOCK[status]
    return <span className={cn('inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap', s.className)}>{s.label}</span>
}

export function VisibilityPill({ status }: { status: ProductStatus }) {
    return status === 'ACTIVE'
        ? <span className='inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'><span className='size-1.5 rounded-full bg-primary' />Active</span>
        : <span className='inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground'><span className='size-1.5 rounded-full bg-muted-foreground' />Inactive</span>
}

export function ProductThumb({ url, title, className }: { url: string | null | undefined; title: string; className?: string }) {
    return url
        ? <img src={url} alt='' className={cn('size-10 shrink-0 rounded-lg border object-cover', className)} />
        : <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-sm font-bold text-muted-foreground', className)}>{title.slice(0, 1).toUpperCase()}</span>
}

export interface GalleryImage { fileId: string; url: string }

const MAX_IMAGES = 10

/**
 * Product media: upload several images straight to ImageKit, first one is the primary.
 * Reorder with the arrows, star to make primary, × to remove.
 */
export function ProductImagesUploader({ images, onChange, disabled }: {
    images: GalleryImage[]
    onChange: (images: GalleryImage[]) => void
    disabled?: boolean
}) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState<{ name: string; progress: number }[]>([])
    const latest = useRef(images)
    latest.current = images

    const addFiles = async (files: FileList | null) => {
        if (!files?.length) return
        const room = MAX_IMAGES - latest.current.length
        const list = Array.from(files).slice(0, room)
        if (files.length > room) toast.warning(`Up to ${MAX_IMAGES} images per product`)
        setUploading(list.map(f => ({ name: f.name, progress: 0 })))
        for (const [i, file] of list.entries()) {
            try {
                const res = await uploadToImageKit('product', file, p => setUploading(u => u.map((x, j) => (j === i ? { ...x, progress: p } : x))))
                onChange([...latest.current, { fileId: res.fileId, url: res.url }])
            } catch (err) {
                toast.error(`${file.name}: ${(err as Error).message}`)
            }
        }
        setUploading([])
        if (inputRef.current) inputRef.current.value = ''
    }

    const move = (from: number, to: number) => {
        const next = [...images]
        const [item] = next.splice(from, 1)
        next.splice(to, 0, item)
        onChange(next)
    }

    return (
        <div>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {images.map((img, i) => (
                    <div key={img.fileId} className={cn('group relative aspect-square overflow-hidden rounded-xl border bg-muted', i === 0 && 'ring-2 ring-primary sm:col-span-2 sm:row-span-2')}>
                        <img src={img.url} alt='' className='size-full object-cover' />
                        {i === 0 && <span className='absolute top-2 left-2 rounded-md bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground'>Primary</span>}
                        {!disabled && (
                            <div className='absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100'>
                                <div className='flex gap-1'>
                                    <IconBtn label='Move left' disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowLeftIcon /></IconBtn>
                                    <IconBtn label='Move right' disabled={i === images.length - 1} onClick={() => move(i, i + 1)}><ArrowRightIcon /></IconBtn>
                                </div>
                                <div className='flex gap-1'>
                                    {i !== 0 && <IconBtn label='Make primary' onClick={() => move(i, 0)}><StarIcon /></IconBtn>}
                                    <IconBtn label='Remove image' onClick={() => onChange(images.filter((_, j) => j !== i))}><XIcon /></IconBtn>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
                {uploading.map((u, i) => (
                    <div key={`up-${i}`} className='flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-3 text-center'>
                        <Loader2Icon className='size-5 animate-spin text-primary' />
                        <span className='w-full truncate text-[11px] text-muted-foreground'>{u.name}</span>
                        <div className='h-1 w-full overflow-hidden rounded-full bg-muted'><div className='h-full bg-primary' style={{ width: `${u.progress}%` }} /></div>
                    </div>
                ))}
                {!disabled && images.length + uploading.length < MAX_IMAGES && (
                    <button type='button' onClick={() => inputRef.current?.click()} disabled={uploading.length > 0}
                        className='flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-progress'>
                        <ImagePlusIcon className='size-6' />
                        <span className='text-xs font-semibold'>Add images</span>
                        <span className='text-[11px]'>PNG, JPG, WEBP · 5 MB</span>
                    </button>
                )}
            </div>
            <input ref={inputRef} type='file' accept='image/png,image/jpeg,image/webp' multiple className='hidden' onChange={e => addFiles(e.target.files)} />
            <p className='mt-3 text-xs text-muted-foreground'>The first image is the primary one customers see first. {images.length}/{MAX_IMAGES} images.</p>
        </div>
    )
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
    return (
        <button type='button' aria-label={label} title={label} onClick={onClick} disabled={disabled}
            className='flex size-7 cursor-pointer items-center justify-center rounded-md bg-white/90 text-foreground shadow-sm hover:bg-white disabled:opacity-40 [&_svg]:size-3.5'>
            {children}
        </button>
    )
}
