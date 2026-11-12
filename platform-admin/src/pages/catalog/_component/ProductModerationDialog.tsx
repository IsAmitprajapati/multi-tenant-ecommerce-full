import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { catalogAdminApi, type PlatformProductDetail } from '@/api/catalog-admin'

export type ModerationAction = 'FLAG' | 'UNFLAG' | 'BLOCK' | 'UNBLOCK'

const COPY: Record<ModerationAction, { title: string; text: string; confirm: string; destructive: boolean; needsReason: boolean; placeholder?: string }> = {
    FLAG: {
        title: 'Flag this listing', confirm: 'Flag listing', destructive: false, needsReason: true,
        text: 'The listing stays live. The seller sees your note on the product so they can fix it.',
        placeholder: 'e.g. Photos don’t match the product title — please upload real product photos.',
    },
    UNFLAG: { title: 'Clear the flag?', confirm: 'Clear flag', destructive: false, needsReason: false, text: 'The warning is removed from the seller’s product.' },
    BLOCK: {
        title: 'Deactivate this listing', confirm: 'Deactivate listing', destructive: true, needsReason: true,
        text: 'It disappears from the store, search, carts and wishlists straight away, and the seller can’t switch it back on. They see your reason.',
        placeholder: 'e.g. Counterfeit branded item — not allowed on the marketplace.',
    },
    UNBLOCK: { title: 'Reactivate this listing?', confirm: 'Reactivate', destructive: false, needsReason: false, text: 'It goes live for shoppers again and the seller can manage it as usual.' },
}

/** Flag / clear flag / deactivate / reactivate a product (Global catalog › Products) */
export default function ProductModerationDialog({ productId, productTitle, action, onClose, onDone }: {
    productId: string
    productTitle: string
    action: ModerationAction
    onClose: () => void
    onDone: (p: PlatformProductDetail) => void
}) {
    const copy = COPY[action]
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    const submit = async () => {
        if (copy.needsReason && reason.trim().length < 5) { setError('Write a short reason the seller will see (at least 5 characters)'); return }
        setBusy(true)
        try {
            const res = action === 'FLAG' || action === 'UNFLAG'
                ? await catalogAdminApi.flag(productId, action === 'FLAG', copy.needsReason ? reason.trim() : undefined)
                : await catalogAdminApi.block(productId, action === 'BLOCK', copy.needsReason ? reason.trim() : undefined)
            toast.success(res.message ?? 'Updated')
            onDone(res.data)
            onClose()
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog open onOpenChange={o => !o && !busy && onClose()}>
            <DialogContent className='sm:max-w-md'>
                <DialogHeader>
                    <DialogTitle>{copy.title}</DialogTitle>
                    <DialogDescription><span className='font-semibold text-foreground'>{productTitle}</span> — {copy.text}</DialogDescription>
                </DialogHeader>
                {copy.needsReason && (
                    <div className='grid gap-1.5'>
                        <Label htmlFor='mod-reason' className='text-xs font-semibold text-muted-foreground'>Reason (shown to the seller)</Label>
                        <Textarea id='mod-reason' rows={3} maxLength={300} value={reason} placeholder={copy.placeholder} aria-invalid={!!error}
                            onChange={e => { setReason(e.target.value); setError('') }} />
                        {error ? <p className='text-xs text-destructive'>{error}</p> : <p className='text-right text-[11px] text-muted-foreground'>{reason.length}/300</p>}
                    </div>
                )}
                <DialogFooter>
                    <Button variant='outline' className='cursor-pointer' onClick={onClose} disabled={busy}>Cancel</Button>
                    <Button variant={copy.destructive ? 'destructive' : 'default'} className='cursor-pointer' onClick={submit} disabled={busy}>
                        {busy && <Spinner />} {copy.confirm}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
