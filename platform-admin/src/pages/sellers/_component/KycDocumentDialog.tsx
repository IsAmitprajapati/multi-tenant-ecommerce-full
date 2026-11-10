import { useEffect, useState } from 'react'
import { AlertCircleIcon, ExternalLinkIcon, FileTextIcon, RotateCwIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { sellerApi, type ISellerDetail } from '@/api/seller'
import { KYC_DOC_PILL, KYC_DOCUMENT_LABEL, Pill } from './seller-status'

type KycDoc = ISellerDetail['kycDocuments'][number]

interface KycDocumentDialogProps {
    sellerId: string
    document: KycDoc | null
    onOpenChange: (open: boolean) => void
}

/**
 * Previews a private KYC document inside a modal.
 * The file is fetched through a short-lived signed URL (valid ~10 minutes).
 */
const KycDocumentDialog = ({ sellerId, document, onOpenChange }: KycDocumentDialogProps) => {
    const [url, setUrl] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [frameLoaded, setFrameLoaded] = useState(false)
    const [attempt, setAttempt] = useState(0)

    useEffect(() => {
        if (!document) return
        let cancelled = false
        setUrl(null); setError(null); setFrameLoaded(false); setLoading(true)
        sellerApi.kycDocumentUrl(sellerId, document.id)
            .then(res => !cancelled && setUrl(res.data.url))
            .catch(err => !cancelled && setError(getAxiosErrorMessage(err, 'Could not load this document')))
            .finally(() => !cancelled && setLoading(false))
        return () => { cancelled = true }
    }, [sellerId, document, attempt])

    const isPdf = document?.mimeType === 'application/pdf'
    const label = document ? (KYC_DOCUMENT_LABEL[document.documentType] ?? document.documentType) : ''

    return (
        <Dialog open={Boolean(document)} onOpenChange={onOpenChange}>
            <DialogContent className='flex h-[90vh] flex-col gap-0 p-0 sm:max-w-4xl' showCloseButton>
                <DialogHeader className='shrink-0 border-b px-5 py-4 pr-12'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <DialogTitle className='flex items-center gap-2 text-base font-semibold'>
                            <FileTextIcon className='size-4 text-primary' /> {label}
                        </DialogTitle>
                        {document && <Pill {...(KYC_DOC_PILL[document.status] ?? KYC_DOC_PILL.PENDING)} />}
                    </div>
                    <DialogDescription className='truncate'>{document?.fileName}</DialogDescription>
                </DialogHeader>

                <div className='relative min-h-0 flex-1 bg-muted/40'>
                    {(loading || (url && !frameLoaded && !error)) && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground'>
                            <Spinner className='size-6 text-primary' />
                            Loading document…
                        </div>
                    )}

                    {error && (
                        <div className='absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'>
                            <AlertCircleIcon className='size-8 text-destructive' />
                            <p className='max-w-sm text-sm text-muted-foreground'>{error}</p>
                            <Button variant='outline' size='sm' className='cursor-pointer' onClick={() => setAttempt(a => a + 1)}>
                                <RotateCwIcon /> Try again
                            </Button>
                        </div>
                    )}

                    {url && !error && (isPdf ? (
                        <iframe
                            key={url}
                            src={url}
                            title={label}
                            className='size-full border-0'
                            onLoad={() => setFrameLoaded(true)}
                        />
                    ) : (
                        <div className='flex size-full items-center justify-center overflow-auto p-4'>
                            <img
                                key={url}
                                src={url}
                                alt={label}
                                className='max-h-full max-w-full rounded-md object-contain shadow-sm'
                                onLoad={() => setFrameLoaded(true)}
                                onError={() => setError('This image could not be displayed. The link may have expired — try again.')}
                            />
                        </div>
                    ))}
                </div>

                <div className='flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3'>
                    <span className='text-xs text-muted-foreground'>Private document · secure link expires in 10 minutes</span>
                    {url && (
                        <Button asChild variant='ghost' size='sm'>
                            <a href={url} target='_blank' rel='noopener noreferrer'>
                                <ExternalLinkIcon /> Open in new tab
                            </a>
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default KycDocumentDialog
