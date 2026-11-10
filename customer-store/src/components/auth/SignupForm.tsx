'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { errorMessage } from '@/lib/auth/client'
import { EMAIL_RE, FormAlert, PASSWORD_HINT, PasswordField, Spinner, STRONG_PASSWORD, TextField } from './fields'

type Form = { fullName: string; email: string; phone: string; password: string }

export default function SignupForm() {
  const { register } = useAuth()
  const router = useRouter()
  const [form, setForm] = useState<Form>({ fullName: '', email: '', phone: '', password: '' })
  const [errors, setErrors] = useState<Partial<Form>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    setErrors((x) => ({ ...x, [k]: undefined }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const phone = form.phone.replace(/[\s-]/g, '')
    const next: Partial<Form> = {}
    if (form.fullName.trim().length < 2) next.fullName = 'Enter your full name'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email'
    if (!/^\+?[1-9]\d{9,14}$/.test(phone)) next.phone = 'Enter a valid 10-digit mobile number'
    if (!STRONG_PASSWORD.test(form.password)) next.password = PASSWORD_HINT
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await register({
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        // 10-digit Indian numbers get the country code
        phone: /^\d{10}$/.test(phone) ? `+91${phone}` : phone,
        password: form.password,
      })
      router.replace('/account')
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className='text-2xl font-bold'>Create your account</h1>
      <p className='mt-1.5 mb-6 text-[13px] text-n-600'>One account for every store on the marketplace.</p>
      <div className='grid gap-3.5'>
        {formError && <FormAlert>{formError}{formError.includes('already exists') && <> <Link href={`/login?email=${encodeURIComponent(form.email.trim())}`} className='underline'>Log in</Link></>}</FormAlert>}
        <TextField label='Full name' autoComplete='name' placeholder='Your name' value={form.fullName} error={errors.fullName} onChange={set('fullName')} autoFocus maxLength={80} />
        <TextField label='Email' type='email' autoComplete='email' placeholder='you@example.com' value={form.email} error={errors.email} onChange={set('email')} />
        <TextField label='Phone number' type='tel' autoComplete='tel' inputMode='tel' placeholder='98765 43210' value={form.phone} error={errors.phone} onChange={set('phone')}
          hint='We’ll use it for delivery updates.' maxLength={16} />
        <PasswordField label='Password' autoComplete='new-password' placeholder='Create a password' value={form.password} error={errors.password} onChange={set('password')} hint={PASSWORD_HINT} />
      </div>
      <button type='submit' className='btn-primary mt-5 w-full' disabled={busy}>{busy && <Spinner />} Create account</button>
      <p className='mt-4 text-center text-[11px] text-n-600'>By continuing, you agree to our Terms &amp; Privacy Policy.</p>
      <p className='mt-4 text-center text-[13px] text-n-600'>Already have an account? <Link href='/login' className='link'>Log in</Link></p>
    </form>
  )
}
