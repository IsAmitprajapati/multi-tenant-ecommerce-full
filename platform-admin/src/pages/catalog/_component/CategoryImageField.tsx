import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { ImageIcon, ShapesIcon, Trash2Icon, UploadCloudIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { uploadToImageKit } from '@/lib/imagekit-upload'
import { catalogApi } from '@/api/catalog'

export interface CategoryImage { fileId: string; url: string }

const COPY = {
    icon: {
        accept: 'image/png,image/webp,image/svg+xml,image/jpeg',
        hint: 'Small icon for the home page “Shop by category” tiles, the menu and the sidebar. A simple square icon works best (SVG or transparent PNG, at least 96 × 96). Without one, a built-in icon is shown.',
    },
    image: {
        accept: 'image/png,image/jpeg,image/webp',
        hint: 'Picture for the category page cards. A wide photo works best (at least 600 × 300). PNG, JPG or WebP, up to 5 MB.',
    },
}

/** Uploads straight to ImageKit; `kind` decides the folder, allowed types and preview shape */
export default function CategoryImageField({ kind, value, onChange, disabled }: {
    kind: 'icon' | 'image'
    value: CategoryImage | null
    onChange: (v: CategoryImage | null) => void
    disabled?: boolean
}) {
    const input = useRef<HTMLInputElement>(null)
    const [progress, setProgress] = useState<number | null>(null)
    const isIcon = kind === 'icon'

    const pick = async (file: File | undefined) => {
        if (!file) return
        setProgress(0)
        try {
            const up = await uploadToImageKit(() => catalogApi.uploadAuth(kind), file, setProgress)
            onChange({ fileId: up.fileId, url: up.url })
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setProgress(null)
            if (input.current) input.current.value = ''
        }
    }

    const uploading = progress !== null
    const Placeholder = isIcon ? ShapesIcon : ImageIcon
    return (
        <div className='flex items-start gap-4'>
            <button type='button' disabled={disabled || uploading} onClick={() => input.current?.click()}
                className={cn('group relative flex shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-dashed bg-muted/40 disabled:cursor-not-allowed',
                    isIcon ? 'size-20 rounded-xl' : 'h-20 w-40 rounded-lg')}>
                {value
                    ? <img src={value.url} alt='' className={isIcon ? 'size-12 object-contain' : 'size-full object-cover'} />
                    : <span className='flex flex-col items-center gap-1 text-xs text-muted-foreground'><Placeholder className='size-5' />Upload</span>}
                {value && !uploading && <span className='absolute inset-0 hidden items-center justify-center bg-black/45 text-white group-hover:flex'><UploadCloudIcon className='size-5' /></span>}
                {uploading && <span className='absolute inset-x-1.5 bottom-1.5 grid gap-1 rounded bg-background/90 p-1 text-[10px]'>{progress}%<Progress value={progress} /></span>}
            </button>
            <input ref={input} type='file' accept={COPY[kind].accept} className='hidden' onChange={e => pick(e.target.files?.[0])} />
            <div className='grid gap-2 pt-0.5'>
                <p className='text-xs text-muted-foreground'>{COPY[kind].hint}</p>
                <div className='flex gap-2'>
                    <Button type='button' variant='outline' size='sm' className='cursor-pointer' disabled={disabled || uploading} onClick={() => input.current?.click()}>
                        <UploadCloudIcon /> {value ? 'Replace' : isIcon ? 'Upload icon' : 'Upload image'}
                    </Button>
                    {value && <Button type='button' variant='ghost' size='sm' className='cursor-pointer text-destructive' disabled={disabled || uploading} onClick={() => onChange(null)}><Trash2Icon /> Remove</Button>}
                </div>
            </div>
        </div>
    )
}
