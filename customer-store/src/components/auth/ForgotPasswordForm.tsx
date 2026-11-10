'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { api, errorMessage } from '@/lib/auth/client'
import { EMAIL_RE, FormAlert, Spinner, TextField } from './fields'

export default function ForgotPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) { setError('Enter a valid email'); return }
    setBusy(true)
    setError('')
    try {
      await api('/auth/forgot-password', { method: 'POST', auth: false, json: { email: value } })
      router.push(`/reset-password?email=${encodeURIComponent(value)}&sent=1`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <Link href='/login' className='mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-n-600 hover:text-n-900'><ArrowLeft className='size-4' /> Back to log in</Link>
      <h1 className='text-2xl font-bold'>Forgot password</h1>
      <p className='mt-1.5 mb-6 text-[13px] text-n-600'>Enter your account email and we’ll send you a 6-digit reset code.</p>
      <div className='grid gap-3.5'>
        {error && !error.startsWith('Enter') && <FormAlert>{error}</FormAlert>}
        <TextField label='Email' type='email' autoComplete='email' placeholder='you@example.com' value={email} autoFocus
          error={error.startsWith('Enter') ? error : undefined} onChange={(e) => { setEmail(e.target.value); setError('') }} />
      </div>
      <button type='submit' className='btn-primary mt-5 w-full' disabled={busy}>{busy && <Spinner />} Send reset code</button>
      <p className='mt-5 text-center text-[13px]'>
        <Link href={`/reset-password${email.trim() ? `?email=${encodeURIComponent(email.trim().toLowerCase())}` : ''}`} className='link'>I already have a reset code</Link>
      </p>
    </form>
  )
}
