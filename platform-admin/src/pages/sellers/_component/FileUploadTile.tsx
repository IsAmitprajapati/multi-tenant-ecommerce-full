import { useRef, useState } from 'react'
import { CheckCircle2Icon, FileTextIcon, ImageIcon, Loader2Icon, RotateCcwIcon, UploadCloudIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { uploadToImageKit, type UploadedFile } from '@/lib/imagekit-upload'
import type { UploadKind } from '@/api/seller'

export interface UploadValue {
    fileId: string
    name: string
    /** Public URL (logos only — KYC files are private) */
    url?: string
}

interface FileUploadTileProps {
    kind: UploadKind
    label: string
    hint?: string
    required?: boolean
    value: UploadValue | null
    onChange: (value: UploadValue | null) => void
    error?: string
    disabled?: boolean
}

const ACCEPT: Record<UploadKind, string> = {
    logo: 'image/png,image/jpeg,image/webp',
    kyc: 'application/pdf,image/png,image/jpeg',
}

const FileUploadTile = ({ kind, label, hint, required, value, onChange, error, disabled }: FileUploadTileProps) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const abortRef = useRef<AbortController | null>(null)
    const [progress, setProgress] = useState<number | null>(null)
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [dragging, setDragging] = useState(false)

    const uploading = progress !== null

    const start = async (file: File | undefined) => {
        if (!file || disabled) return
        setUploadError(null)
        setProgress(0)
        abortRef.current = new AbortController()
        try {
            const res: UploadedFile = await uploadToImageKit(kind, file, setProgress, abortRef.current.signal)
            onChange({ fileId: res.fileId, name: file.name, url: kind === 'logo' ? res.url : undefined })
        } catch (err) {
            setUploadError((err as Error).message)
        } finally {
            setProgress(null)
            abortRef.current = null
            if (inputRef.current) inputRef.current.value = ''
        }
    }

    const Icon = kind === 'logo' ? ImageIcon : FileTextIcon
    const shownError = uploadError ?? error

    return (
        <div>
            <div
                role='button'
                tabIndex={disabled ? -1 : 0}
                aria-label={`Upload ${label}`}
                onClick={() => !uploading && !disabled && inputRef.current?.click()}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && !uploading && inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); start(e.dataTransfer.files?.[0]) }}
                className={cn(
                    'relative flex items-center gap-3 rounded-xl border-[1.5px] p-4 transition-colors outline-none',
                    'focus-visible:ring-3 focus-visible:ring-ring/50',
                    value ? 'border-solid border-primary/40 bg-primary/5' : 'border-dashed',
                    dragging && 'border-primary bg-primary/5',
                    shownError && !value && 'border-destructive/60',
                    disabled ? 'cursor-not-allowed opacity-60' : uploading ? 'cursor-progress' : 'cursor-pointer hover:bg-muted/40'
                )}
            >
                <div className={cn(
                    'flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg',
                    value ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                    {kind === 'logo' && value?.url
                        ? <img src={value.url} alt='' className='size-full object-cover' />
                        : uploading ? <Loader2Icon className='size-5 animate-spin' />
                            : value ? <CheckCircle2Icon className='size-5' />
                                : <Icon className='size-5' />}
                </div>

                <div className='min-w-0 flex-1'>
                    <div className='text-sm font-semibold'>
                        {label}{required && <span className='text-destructive'> *</span>}
                    </div>
                    <div className='truncate text-xs text-muted-foreground'>
                        {uploading ? `Uploading… ${progress}%`
                            : value ? value.name
                                : hint ?? 'Click or drop a file to upload'}
                    </div>
                    {uploading && (
                        <div className='mt-1.5 h-1 overflow-hidden rounded-full bg-muted'>
                            <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${progress}%` }} />
                        </div>
                    )}
                </div>

                {uploading ? (
                    <button type='button' aria-label='Cancel upload' className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                        onClick={e => { e.stopPropagation(); abortRef.current?.abort() }}>
                        <XIcon className='size-4' />
                    </button>
                ) : value ? (
                    <div className='flex gap-1'>
                        <button type='button' aria-label={`Replace ${label}`} title='Replace' disabled={disabled}
                            className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground'
                            onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>
                            <RotateCcwIcon className='size-4' />
                        </button>
                        <button type='button' aria-label={`Remove ${label}`} title='Remove' disabled={disabled}
                            className='rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive'
                            onClick={e => { e.stopPropagation(); onChange(null) }}>
                            <XIcon className='size-4' />
                        </button>
                    </div>
                ) : (
                    <UploadCloudIcon className='size-4 text-muted-foreground' />
                )}

                <input
                    ref={inputRef}
                    type='file'
                    accept={ACCEPT[kind]}
                    className='hidden'
                    onChange={e => start(e.target.files?.[0])}
                    disabled={disabled}
                />
            </div>
            {shownError && <p className='mt-1.5 text-xs text-destructive'>{shownError}</p>}
        </div>
    )
}

export default FileUploadTile
