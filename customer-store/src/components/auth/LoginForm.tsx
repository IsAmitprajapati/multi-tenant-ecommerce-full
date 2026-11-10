'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'
import { errorMessage } from '@/lib/auth/client'
import { EMAIL_RE, FormAlert, PasswordField, Spinner, TextField } from './fields'

/** Only redirect back to our own pages */
const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : '/account')

export default function LoginForm() {
  const { login } = useAuth()
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const reset = params.get('reset') === '1'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email'
    if (!password) next.password = 'Enter your password'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await login(email, password)
      router.replace(safeNext(params.get('next')))
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <h1 className='text-2xl font-bold'>Welcome back</h1>
      <p className='mt-1.5 mb-6 text-[13px] text-n-600'>Log in to track orders and check out faster.</p>
      <div className='grid gap-3.5'>
        {reset && !formError && <FormAlert tone='success'>Password updated. Log in with your new password.</FormAlert>}
        {formError && <FormAlert>{formError}</FormAlert>}
        <TextField label='Email' type='email' autoComplete='email' placeholder='you@example.com' value={email} error={errors.email}
          onChange={(e) => { setEmail(e.target.value); setErrors((x) => ({ ...x, email: undefined })) }} autoFocus />
        <div>
          <PasswordField label='Password' autoComplete='current-password' placeholder='••••••••' value={password} error={errors.password}
            onChange={(e) => { setPassword(e.target.value); setErrors((x) => ({ ...x, password: undefined })) }} />
          <div className='mt-2 text-right'>
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`} className='link text-xs'>Forgot password?</Link>
          </div>
        </div>
      </div>
      <button type='submit' className='btn-primary mt-4 w-full' disabled={busy}>{busy && <Spinner />} Log in</button>
      <p className='mt-5 text-center text-[13px] text-n-600'>New here? <Link href='/signup' className='link'>Create an account</Link></p>
    </form>
  )
}
