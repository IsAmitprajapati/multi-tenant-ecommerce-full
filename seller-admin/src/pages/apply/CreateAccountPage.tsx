import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { authApi } from '@/api/auth'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { strongPasswordSchema } from '@/lib/zod/password'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { fetchMe, setSession } from '@/store/auth/authSlice'
import { ApplyStepper } from '@/layouts/ApplyLayout'

const schema = z.object({
    fullName: z.string().trim().min(2, 'Enter your full name'),
    phone: z.string().transform(v => v.replace(/[\s-]/g, '')).refine(v => /^\+?[1-9]\d{9,14}$/.test(v), 'Enter a valid phone number'),
    email: z.string().trim().toLowerCase().email('Enter a valid business email'),
    password: strongPasswordSchema,
    confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] })

type Form = z.input<typeof schema>
type Errors = Partial<Record<keyof Form, string>>

/** Seller signup — step 1 of 5. Creates the owner account and signs in. */
export default function CreateAccountPage() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const signedIn = Boolean(useAppSelector(s => s.auth.accessToken))
    const [form, setForm] = useState<Form>({ fullName: '', phone: '', email: '', password: '', confirmPassword: '' })
    const [errors, setErrors] = useState<Errors>({})
    const [submitting, setSubmitting] = useState(false)

    // Already signed in → continue the application
    useEffect(() => { if (signedIn) navigate('/apply/details', { replace: true }) }, [signedIn, navigate])

    const set = (k: keyof Form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })) }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        const r = schema.safeParse(form)
        if (!r.success) {
            const errs: Errors = {}
            r.error.issues.forEach(i => { const k = i.path[0] as keyof Form; if (!errs[k]) errs[k] = i.message })
            setErrors(errs)
            return
        }
        setSubmitting(true)
        try {
            const res = await authApi.registerSeller({ fullName: r.data.fullName, phone: r.data.phone, email: r.data.email, password: r.data.password })
            dispatch(setSession({ accessToken: res.accessToken, refreshToken: res.refreshToken }))
            await dispatch(fetchMe())
            toast.success('Account created — tell us about your business')
            navigate('/apply/details', { replace: true })
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Could not create your account')
            if (/already exists/i.test(message)) setErrors({ email: message })
            toast.error(message)
        } finally {
            setSubmitting(false)
        }
    }

    const field = (k: keyof Form) => errors[k] && <p className='text-xs text-destructive'>{errors[k]}</p>

    return (
        <>
            <ApplyStepper step={0} />
            <form onSubmit={submit} className='rounded-2xl border bg-card p-6 sm:p-8'>
                <h1 className='text-lg font-bold'>Create your seller account</h1>
                <p className='mt-1 mb-6 text-sm text-muted-foreground'>
                    This is what you’ll use to sign in to your seller dashboard once you’re approved.
                </p>
                <div className='grid gap-x-4 gap-y-5 sm:grid-cols-2'>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='fullName' className='text-xs font-semibold text-muted-foreground'>Full name</Label>
                        <Input id='fullName' className='h-10' placeholder='Amit Prajapati' value={form.fullName} onChange={e => set('fullName', e.target.value)} aria-invalid={!!errors.fullName} />
                        {field('fullName')}
                    </div>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='phone' className='text-xs font-semibold text-muted-foreground'>Phone number</Label>
                        <Input id='phone' type='tel' className='h-10' placeholder='+91 98765 43210' value={form.phone} onChange={e => set('phone', e.target.value)} aria-invalid={!!errors.phone} />
                        {field('phone')}
                    </div>
                    <div className='grid gap-1.5 sm:col-span-2'>
                        <Label htmlFor='email' className='text-xs font-semibold text-muted-foreground'>Business email</Label>
                        <Input id='email' type='email' className='h-10' placeholder='owner@yourbusiness.com' autoComplete='email' value={form.email} onChange={e => set('email', e.target.value)} aria-invalid={!!errors.email} />
                        {field('email')}
                    </div>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='password' className='text-xs font-semibold text-muted-foreground'>Password</Label>
                        <PasswordInput id='password' className='h-10' placeholder='••••••••' autoComplete='new-password' value={form.password} onChange={e => set('password', e.target.value)} aria-invalid={!!errors.password} />
                        {field('password')}
                    </div>
                    <div className='grid gap-1.5'>
                        <Label htmlFor='confirmPassword' className='text-xs font-semibold text-muted-foreground'>Confirm password</Label>
                        <PasswordInput id='confirmPassword' className='h-10' placeholder='••••••••' autoComplete='new-password' value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} aria-invalid={!!errors.confirmPassword} />
                        {field('confirmPassword')}
                    </div>
                </div>
                <div className='mt-8 flex justify-end'>
                    <Button type='submit' className='h-11 min-w-36 px-7' disabled={submitting}>
                        {submitting && <Spinner />} Create account
                    </Button>
                </div>
            </form>
        </>
    )
}
