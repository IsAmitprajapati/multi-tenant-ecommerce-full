'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api, errorMessage } from '@/lib/auth/client'
import { FormAlert, PASSWORD_HINT, PasswordField, Spinner, STRONG_PASSWORD } from '@/components/auth/fields'

type Errors = Partial<Record<'current' | 'password' | 'confirm', string>>

export default function PasswordForm() {
  const { user } = useAuth()
  const [current, setCurrent] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: Errors = {}
    if (!current) next.current = 'Enter your current password'
    if (!STRONG_PASSWORD.test(password)) next.password = PASSWORD_HINT
    else if (password === current) next.password = 'Choose a password different from the current one'
    if (confirm !== password) next.confirm = 'Passwords don’t match'
    setErrors(next)
    setResult(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      await api('/users/change-password', { method: 'PUT', json: { email: user?.email, fullName: user?.fullName, currentPassword: current, password } })
      setCurrent(''); setPassword(''); setConfirm('')
      setResult({ tone: 'success', text: 'Password changed' })
    } catch (err) {
      const msg = errorMessage(err)
      if (/current password/i.test(msg)) setErrors({ current: msg })
      else setResult({ tone: 'error', text: msg })
    } finally { setBusy(false) }
  }

  const clear = (k: keyof Errors) => { setErrors((x) => ({ ...x, [k]: undefined })); setResult(null) }

  return (
    <form onSubmit={save} noValidate className='card max-w-[560px]'>
      <h1 className='text-base font-bold'>Change password</h1>
      <p className='mt-1 mb-5 text-[13px] text-n-600'>
        {user?.passwordUpdatedAt ? `Last changed ${new Date(user.passwordUpdatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.` : 'Use a password you don’t use anywhere else.'}
      </p>
      <div className='grid gap-4'>
        {result && <FormAlert tone={result.tone}>{result.text}</FormAlert>}
        <PasswordField label='Current password' autoComplete='current-password' value={current} error={errors.current} onChange={(e) => { setCurrent(e.target.value); clear('current') }} />
        <PasswordField label='New password' autoComplete='new-password' value={password} error={errors.password} hint={PASSWORD_HINT} onChange={(e) => { setPassword(e.target.value); clear('password') }} />
        <PasswordField label='Confirm new password' autoComplete='new-password' value={confirm} error={errors.confirm} onChange={(e) => { setConfirm(e.target.value); clear('confirm') }} />
      </div>
      <button type='submit' className='btn-primary mt-5 px-6 py-2.5 text-[13px]' disabled={busy}>{busy && <Spinner />} Update password</button>
    </form>
  )
}
