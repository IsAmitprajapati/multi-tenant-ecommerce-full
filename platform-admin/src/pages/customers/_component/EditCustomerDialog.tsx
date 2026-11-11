import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { customerApi, type ICustomerDetail } from '@/api/customer'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^\+?[1-9]\d{9,14}$/

type Form = { fullName: string; email: string; phone: string }

/** Edit customer (design: name, email, phone) — the customer gets an in-app notice of what changed */
export default function EditCustomerDialog({ customer, open, onOpenChange, onSaved }: {
    customer: ICustomerDetail
    open: boolean
    onOpenChange: (open: boolean) => void
    onSaved: (c: ICustomerDetail) => void
}) {
    const [form, setForm] = useState<Form>({ fullName: customer.fullName, email: customer.email, phone: customer.phone ?? '' })
    const [errors, setErrors] = useState<Partial<Form>>({})
    const [saving, setSaving] = useState(false)

    const set = (k: keyof Form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        const fullName = form.fullName.trim()
        const email = form.email.trim().toLowerCase()
        const phone = form.phone.replace(/[\s-]/g, '')
        const next: Partial<Form> = {}
        if (fullName.length < 2) next.fullName = 'Enter at least 2 characters'
        if (!EMAIL.test(email)) next.email = 'Enter a valid email'
        if (phone && !PHONE.test(phone)) next.phone = 'Enter a valid phone number, e.g. +919876543210'
        setErrors(next)
        if (Object.keys(next).length) return

        const payload = {
            ...(fullName !== customer.fullName && { fullName }),
            ...(email !== customer.email && { email }),
            ...(phone !== (customer.phone ?? '') && { phone }),
        }
        if (!Object.keys(payload).length) { onOpenChange(false); return }

        setSaving(true)
        try {
            const res = await customerApi.update(customer.id, payload)
            toast.success(res.message ?? 'Customer updated')
            onSaved(res.data)
            onOpenChange(false)
        } catch (err) {
            const msg = getAxiosErrorMessage(err, 'Could not save changes')
            if (/email/i.test(msg)) setErrors({ email: msg })
            else toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    const field = (k: keyof Form, label: string, props: React.ComponentProps<typeof Input>) => (
        <div className='grid gap-1.5'>
            <Label htmlFor={`cust-${k}`} className='text-xs font-semibold text-muted-foreground'>{label}</Label>
            <Input id={`cust-${k}`} className='h-10' value={form[k]} onChange={e => set(k, e.target.value)} aria-invalid={!!errors[k]} disabled={saving} {...props} />
            {errors[k] && <p className='text-xs text-destructive'>{errors[k]}</p>}
        </div>
    )

    return (
        <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={save} noValidate className='grid gap-5'>
                    <DialogHeader>
                        <DialogTitle>Edit customer</DialogTitle>
                        <DialogDescription>The customer is notified in their account when you change these details.</DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4'>
                        {field('fullName', 'Name', { maxLength: 80, autoComplete: 'off' })}
                        {field('email', 'Email', { type: 'email', placeholder: 'customer@email.com', autoComplete: 'off' })}
                        {field('phone', 'Phone (optional)', { type: 'tel', placeholder: '+91 98765 43210', autoComplete: 'off' })}
                    </div>
                    {form.email.trim().toLowerCase() !== customer.email && (
                        <p className='rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800'>They’ll log in with the new email from now on.</p>
                    )}
                    <DialogFooter>
                        <Button type='button' variant='outline' className='cursor-pointer' onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                        <Button type='submit' className='cursor-pointer' disabled={saving}>{saving && <Spinner />} Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
