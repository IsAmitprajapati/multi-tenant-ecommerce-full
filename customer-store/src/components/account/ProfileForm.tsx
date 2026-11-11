'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api, errorMessage } from '@/lib/auth/client'
import { Field, FormAlert, Spinner, TextField } from '@/components/auth/fields'
import type { CurrentUser } from '@/lib/types'
import SelectMenu from '@/components/ui/SelectMenu'

type Gender = NonNullable<CurrentUser['gender']>
const GENDERS: { value: Gender | ''; label: string }[] = [
  { value: '', label: 'Select' },
  { value: 'FEMALE', label: 'Female' },
  { value: 'MALE', label: 'Male' },
  { value: 'OTHER', label: 'Other' },
  { value: 'PREFER_NOT_TO_SAY', label: 'Prefer not to say' },
]

/** YYYY-MM-DD for a 13-year-old today (the API's minimum age) */
const maxBirthDate = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 13)
  return d.toISOString().slice(0, 10)
}

/** My account › Profile (design: name, phone, email, gender, date of birth) */
export default function ProfileForm() {
  const { user, setUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [gender, setGender] = useState<Gender | ''>(user?.gender ?? '')
  const [dob, setDob] = useState(user?.dateOfBirth?.slice(0, 10) ?? '')
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; dob?: string }>({})
  const [result, setResult] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  if (!user) return null

  const dirty = fullName.trim() !== user.fullName
    || phone.replace(/[\s-]/g, '') !== (user.phone ?? '')
    || gender !== (user.gender ?? '')
    || dob !== (user.dateOfBirth?.slice(0, 10) ?? '')

  const clear = (k: keyof typeof errors) => { setErrors((x) => ({ ...x, [k]: undefined })); setResult(null) }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const p = phone.replace(/[\s-]/g, '')
    const next: typeof errors = {}
    if (fullName.trim().length < 2) next.fullName = 'Enter your full name'
    if (p && !/^\+?[1-9]\d{9,14}$/.test(p)) next.phone = 'Enter a valid mobile number'
    if (dob && (dob > maxBirthDate() || dob < '1900-01-01')) next.dob = 'Enter a valid date of birth (you must be at least 13)'
    setErrors(next)
    setResult(null)
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const normalized = /^\d{10}$/.test(p) ? `+91${p}` : p
      const res = await api<{ data: Pick<CurrentUser, 'fullName' | 'phone' | 'gender' | 'dateOfBirth'> }>('/users/me', {
        method: 'PUT',
        json: { email: user.email, fullName: fullName.trim(), ...(normalized && { phone: normalized }), gender: gender || null, dateOfBirth: dob || null },
      })
      setUser({ ...user, ...res.data })
      setPhone(res.data.phone ?? '')
      setResult({ tone: 'success', text: 'Profile saved' })
    } catch (err) {
      setResult({ tone: 'error', text: errorMessage(err) })
    } finally { setBusy(false) }
  }

  return (
    <form onSubmit={save} noValidate className='card'>
      <h2 className='text-[15px] font-bold'>Personal details</h2>
      <p className='mt-1 mb-5 text-[13px] text-n-600'>Your name and number are shared with stores only to deliver your orders.</p>
      <div className='grid gap-4 sm:grid-cols-2'>
        {result && <div className='sm:col-span-2'><FormAlert tone={result.tone}>{result.text}</FormAlert></div>}
        <TextField label='Full name' autoComplete='name' value={fullName} error={errors.fullName} maxLength={80}
          onChange={(e) => { setFullName(e.target.value); clear('fullName') }} />
        <TextField label='Phone' type='tel' autoComplete='tel' value={phone} error={errors.phone} maxLength={16}
          onChange={(e) => { setPhone(e.target.value); clear('phone') }} />
        <div className='sm:col-span-2'>
          <TextField label='Email' type='email' value={user.email} disabled hint='Your email is your login and can’t be changed here.' />
        </div>
        <Field id='gender' label='Gender'>
          <SelectMenu id='gender' value={gender} onChange={(v) => { setGender(v as Gender | ''); setResult(null) }}
            options={GENDERS.filter((g) => g.value)} placeholder='Select' />
        </Field>
        <TextField label='Date of birth' type='date' value={dob} error={errors.dob} min='1900-01-01' max={maxBirthDate()} autoComplete='bday'
          onChange={(e) => { setDob(e.target.value); clear('dob') }} />
      </div>
      <button type='submit' className='btn-primary mt-5 px-6 py-2.5 text-[13px]' disabled={busy || !dirty}>{busy && <Spinner />} Save changes</button>
    </form>
  )
}
