'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { api, errorMessage } from '@/lib/auth/client'
import { EMAIL_RE, FormAlert, PASSWORD_HINT, PasswordField, Spinner, STRONG_PASSWORD, TextField } from './fields'

type Errors = Partial<Record<'email' | 'otp' | 'password' | 'confirm', string>>

/** Enter the emailed code + a new password. Code check and reset happen in one submit. */
export default function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState(params.get('sent') === '1' ? 'We’ve emailed you a 6-digit code. It’s valid for 5 minutes.' : '')
  const [busy, setBusy] = useState(false)
  const [resending, setResending] = useState(false)
  // A verified code is single-use, so keep its token if only the reset step fails
  const [resetToken, setResetToken] = useState<string | null>(null)

  const clear = (k: keyof Errors) => { setErrors((x) => ({ ...x, [k]: undefined })); setFormError('') }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    const next: Errors = {}
    if (!EMAIL_RE.test(value)) next.email = 'Enter a valid email'
    if (!resetToken && !/^\d{6}$/.test(otp.trim())) next.otp = 'Enter the 6-digit code from your email'
    if (!STRONG_PASSWORD.test(password)) next.password = PASSWORD_HINT
    if (confirm !== password) next.confirm = 'Passwords don’t match'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return

    setBusy(true)
    try {
      let token = resetToken
      if (!token) {
        const verified = await api<{ data: { resetToken: string } }>('/auth/forgot-password-verify-otp', { method: 'POST', auth: false, json: { email: value, otp: otp.trim() } })
        token = verified.data.resetToken
        setResetToken(token)
      }
      await api('/auth/reset-password', { method: 'POST', auth: false, json: { email: value, resetToken: token, password } })
      router.replace(`/login?reset=1&email=${encodeURIComponent(value)}`)
    } catch (err) {
      const msg = errorMessage(err)
      // Expired verification → start over with a fresh code
      if (resetToken && /expired|invalid/i.test(msg)) setResetToken(null)
      setFormError(/otp/i.test(msg) ? 'That code is wrong or has expired. Check the email or request a new code.' : msg)
      setBusy(false)
    }
  }

  const resend = async () => {
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) { setErrors({ email: 'Enter your email first' }); return }
    setResending(true)
    setFormError('')
    try {
      await api('/auth/forgot-password', { method: 'POST', auth: false, json: { email: value } })
      setResetToken(null)
      setOtp('')
      setNotice('A new code is on its way. Use the latest email.')
    } catch (err) {
      setFormError(errorMessage(err))
    } finally { setResending(false) }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Link href='/forgot-password' className='mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-n-600 hover:text-n-900'><ArrowLeft className='size-4' /> Back</Link>
      <h1 className='text-2xl font-bold'>Set a new password</h1>
      <p className='mt-1.5 mb-6 text-[13px] text-n-600'>Enter the code we emailed you and choose a new password.</p>
      <div className='grid gap-3.5'>
        {formError ? <FormAlert>{formError}</FormAlert> : notice && <FormAlert tone='success'>{notice}</FormAlert>}
        <TextField label='Email' type='email' autoComplete='email' value={email} error={errors.email} onChange={(e) => { setEmail(e.target.value); setResetToken(null); clear('email') }} />
        {!resetToken && (
          <div>
            <TextField label='Reset code' inputMode='numeric' autoComplete='one-time-code' placeholder='6-digit code' maxLength={6} value={otp} error={errors.otp}
              className='field tracking-[0.3em]' onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); clear('otp') }} autoFocus={!!email} />
            <button type='button' className='link mt-2 text-xs disabled:opacity-60' onClick={resend} disabled={resending}>{resending ? 'Sending…' : 'Resend code'}</button>
          </div>
        )}
        <PasswordField label='New password' autoComplete='new-password' value={password} error={errors.password} hint={PASSWORD_HINT} onChange={(e) => { setPassword(e.target.value); clear('password') }} />
        <PasswordField label='Confirm password' autoComplete='new-password' value={confirm} error={errors.confirm} onChange={(e) => { setConfirm(e.target.value); clear('confirm') }} />
      </div>
      <button type='submit' className='btn-primary mt-5 w-full' disabled={busy}>{busy && <Spinner />} Reset password</button>
    </form>
  )
}
