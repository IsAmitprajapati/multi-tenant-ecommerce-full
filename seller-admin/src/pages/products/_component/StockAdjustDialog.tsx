import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { MinusIcon, PackagePlusIcon, PlusIcon } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { productsApi, type AdjustmentReason, type CatalogMeta, type ProductDetail } from '@/api/products'

interface Props {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: ProductDetail
    reasons: CatalogMeta['adjustmentReasons']
    onSaved: (p: ProductDetail) => void
}

export default function StockAdjustDialog({ open, onOpenChange, product, reasons, onSaved }: Props) {
    const hasVariants = product.variants.length > 0
    const [variantId, setVariantId] = useState('')
    const [direction, setDirection] = useState<'add' | 'remove'>('add')
    const [qty, setQty] = useState('')
    const [reason, setReason] = useState<AdjustmentReason>('RESTOCK')
    const [note, setNote] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (!open) return
        setVariantId(product.variants[0]?.id ?? ''); setDirection('add'); setQty(''); setReason('RESTOCK'); setNote(''); setError(null)
    }, [open, product])

    // Sensible default reason per direction
    useEffect(() => { setReason(direction === 'add' ? 'RESTOCK' : 'DAMAGED') }, [direction])

    const current = hasVariants ? product.variants.find(v => v.id === variantId)?.inventoryQty ?? 0 : product.inventoryQty
    const n = Number(qty)
    const valid = Number.isInteger(n) && n > 0
    const after = valid ? current + (direction === 'add' ? n : -n) : current

    const save = async () => {
        if (!valid) { setError('Enter a whole number greater than 0'); return }
        if (after < 0) { setError(`Only ${current} in stock — you can remove at most ${current}`); return }
        setSaving(true)
        try {
            const res = await productsApi.adjustStock(product.id, {
                ...(hasVariants && { variantId }),
                change: direction === 'add' ? n : -n,
                reason,
                note: note.trim() || undefined,
            })
            toast.success(res.message ?? 'Stock updated')
            onSaved(res.data)
            onOpenChange(false)
        } catch (err) {
            setError(getAxiosErrorMessage(err, 'Could not update stock'))
        } finally { setSaving(false) }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='gap-0 p-0 sm:max-w-md' showCloseButton>
                <DialogHeader className='border-b px-6 pt-6 pb-4'>
                    <DialogTitle className='flex items-center gap-2 text-lg font-bold'><PackagePlusIcon className='size-5 text-primary' /> Adjust stock</DialogTitle>
                    <DialogDescription>Every change is recorded in the stock adjustment log.</DialogDescription>
                </DialogHeader>
                <div className='grid gap-4 px-6 py-5'>
                    {hasVariants && (
                        <div className='grid gap-1.5'>
                            <Label className='text-xs font-semibold text-muted-foreground'>Variant</Label>
                            <Select value={variantId} onValueChange={setVariantId}>
                                <SelectTrigger className='h-10! w-full'><SelectValue /></SelectTrigger>
                                <SelectContent position='popper'>
                                    {product.variants.map(v => <SelectItem key={v.id} value={v.id}>{v.name} · {v.inventoryQty} in stock</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className='grid grid-cols-2 gap-2' role='radiogroup' aria-label='Direction'>
                        {(['add', 'remove'] as const).map(d => (
                            <button key={d} type='button' role='radio' aria-checked={direction === d} onClick={() => { setDirection(d); setError(null) }}
                                className={cn('flex cursor-pointer items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-semibold transition-colors',
                                    direction === d ? (d === 'add' ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary' : 'border-destructive bg-destructive/5 text-destructive ring-1 ring-destructive') : 'hover:bg-muted/50')}>
                                {d === 'add' ? <PlusIcon className='size-4' /> : <MinusIcon className='size-4' />} {d === 'add' ? 'Add stock' : 'Remove stock'}
                            </button>
                        ))}
                    </div>
                    <div className='grid grid-cols-2 gap-3'>
                        <div className='grid gap-1.5'>
                            <Label htmlFor='qty' className='text-xs font-semibold text-muted-foreground'>Quantity</Label>
                            <Input id='qty' type='number' min={1} step={1} className='h-10' value={qty} autoFocus aria-invalid={!!error}
                                onChange={e => { setQty(e.target.value); setError(null) }} />
                        </div>
                        <div className='grid gap-1.5'>
                            <Label className='text-xs font-semibold text-muted-foreground'>Reason</Label>
                            <Select value={reason} onValueChange={v => setReason(v as AdjustmentReason)}>
                                <SelectTrigger className='h-10! w-full'><SelectValue /></SelectTrigger>
                                <SelectContent position='popper'>
                                    {reasons.filter(r => r.manual).map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='note' className='text-xs font-semibold text-muted-foreground'>Note <span className='font-normal'>(optional)</span></Label>
                        <Input id='note' className='h-10' placeholder='e.g. Supplier invoice #2231' maxLength={200} value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                    <div className='flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2.5 text-sm'>
                        <span className='text-muted-foreground'>Stock on hand</span>
                        <span className='font-semibold tabular-nums'>{current} → <span className={cn(after < 0 ? 'text-destructive' : 'text-primary')}>{after}</span></span>
                    </div>
                    {error && <p className='text-xs text-destructive'>{error}</p>}
                </div>
                <DialogFooter className='mx-0 mb-0 rounded-b-xl border-t px-6 py-4'>
                    <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving} className='cursor-pointer'>Cancel</Button>
                    <Button onClick={save} disabled={saving} className='min-w-32 cursor-pointer'>{saving && <Spinner />} Save adjustment</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
