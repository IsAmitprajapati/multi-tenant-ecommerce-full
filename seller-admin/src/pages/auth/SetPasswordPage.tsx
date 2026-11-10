import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { AlertCircleIcon, KeyRoundIcon } from 'lucide-react'
import PasswordInput from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { authApi } from '@/api/auth'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { PasswordConfirmPasswordSchema } from '@/lib/zod/password'

/**
 * Landing page for the invite link sent when a platform admin onboards a seller:
 *   /auth/set-password?token=<reset token>&email=<owner email>
 * Reuses the backend's reset-password endpoint.
 */
export default function SetPasswordPage() {
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const token = params.get('token') ?? ''
    const email = params.get('email') ?? ''

    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({})
    const [submitting, setSubmitting] = useState(false)

    if (!token || !email) {
        return (
            <div className='w-full max-w-sm text-center'>
                <AlertCircleIcon className='mx-auto size-10 text-destructive' />
                <h2 className='mt-4 text-xl font-bold'>Invalid invite link</h2>
                <p className='mt-2 text-sm text-muted-foreground'>
                    This link is incomplete. Open the link from your invite email again, or reset your password.
                </p>
                <Button asChild className='mt-6 h-11 w-full'><Link to='/auth/forgot-password'>Reset password</Link></Button>
            </div>
        )
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const r = PasswordConfirmPasswordSchema.safeParse({ password, confirmPassword })
        if (!r.success) {
            const errs: typeof errors = {}
            r.error.issues.forEach(i => { const k = i.path[0] as keyof typeof errors; if (!errs[k]) errs[k] = i.message })
            setErrors(errs)
            return
        }
        setSubmitting(true)
        try {
            await authApi.resetPassword({ email, resetToken: token, password })
            toast.success('Password set — sign in to your seller dashboard')
            navigate('/auth/login', { replace: true })
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'This link is invalid or has expired'))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className='w-full max-w-sm'>
            <span className='flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <KeyRoundIcon className='size-5' />
            </span>
            <h2 className='mt-4 text-2xl font-bold'>Set your password</h2>
            <p className='mt-1.5 text-sm text-muted-foreground'>
                Your seller account is ready. Choose a password to sign in to your dashboard.
            </p>

            <form className='mt-7' onSubmit={handleSubmit}>
                <FieldGroup>
                    <Field>
                        <FieldLabel htmlFor='email'>Business email</FieldLabel>
                        <Input id='email' className='h-11' value={email} disabled readOnly />
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='password'>New password</FieldLabel>
                        <PasswordInput id='password' className='h-11' placeholder='••••••••' autoComplete='new-password'
                            value={password} onChange={e => { setPassword(e.target.value); setErrors({}) }} disabled={submitting} />
                        {errors.password && <p className='text-xs text-destructive'>{errors.password}</p>}
                    </Field>
                    <Field>
                        <FieldLabel htmlFor='confirmPassword'>Confirm password</FieldLabel>
                        <PasswordInput id='confirmPassword' className='h-11' placeholder='••••••••' autoComplete='new-password'
                            value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setErrors({}) }} disabled={submitting} />
                        {errors.confirmPassword && <p className='text-xs text-destructive'>{errors.confirmPassword}</p>}
                    </Field>
                    <Button type='submit' className='mt-2 h-11 w-full' disabled={submitting}>
                        {submitting && <Spinner />} Set password
                    </Button>
                </FieldGroup>
            </form>
        </div>
    )
}
