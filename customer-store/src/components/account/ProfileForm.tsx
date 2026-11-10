'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api, errorMessage } from '@/lib/auth/client'
import { FormAlert, Spinner, TextField } from '@/components/auth/fields'
import type { CurrentUser } from '@/lib/types'

export default function ProfileForm() {
  const { user, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string }>({})
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!user) return null

  const dirty = fullName.trim() !== user.fullName || phone.replace(/[\s-]/g, '') !== (user.phone ?? '')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = phone.replace(/[\s-]/g, '')
    const next: typeof errors = {}
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name'
    if (p && !/^\+?[1-9]\d{9,14}$/.test(p)) next.phone = 'Enter a valid mobile number'
    setErrors(next)
    setResult(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const normalized = /^\d{10}$/.test(p) ? `+91${p}` : p
      const res = await api<{ data: Pick<CurrentUser, 'fullName' | 'phone'> }>('/users/me', {
        method: 'PUT',
        json: { email: user.email, fullName: fullName.trim(), ...(normalized && { phone: normalized }) },
      })
      setUser({ ...user, fullName: res.data.fullName, phone: res.data.phone })
      setPhone(res.data.phone ?? '')
      setResult({ tone: 'success', text: 'Profile saved' })
    } catch (err) {
      setResult({ tone: 'error', text: errorMessage(err) })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} noValidate className='card max-w-[560px]'>
      <h1 className='text-base font-bold'>Edit profile</h1>
      <p className='mt-1 mb-5 text-[13px] text-n-600'>Your name and number are shared with stores only to deliver your orders.</p>
      <div className='grid gap-4 sm:grid-cols-2'>
        {result && <div className='sm:col-span-2'><FormAlert tone={result.tone}>{result.text}</FormAlert></div>}
        <TextField label='Full name' autoComplete='name' value={fullName} error={errors.fullName} maxLength={80}
          onChange={(e) => { setFullName(e.target.value); setErrors((x) => ({ ...x, fullName: undefined })); setResult(null) }} />
        <TextField label='Phone' type='tel' autoComplete='tel' value={phone} error={errors.phone} maxLength={16}
          onChange={(e) => { setPhone(e.target.value); setErrors((x) => ({ ...x, phone: undefined })); setResult(null) }} />
        <div className='sm:col-span-2'>
          <TextField label='Email' type='email' value={user.email} disabled hint='Your email is your login and can’t be changed here.' />
        </div>
      </div>
      <button type='submit' className='btn-primary mt-5 px-6 py-2.5 text-[13px]' disabled={busy || !dirty}>{busy && <Spinner />} Save changes</button>
    </form>
  )
}
