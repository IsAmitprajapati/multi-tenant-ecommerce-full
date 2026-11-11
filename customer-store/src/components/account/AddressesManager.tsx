'use client'

import { useEffect, useState } from 'react'
import { MapPin, Plus } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api, errorMessage } from '@/lib/auth/client'
import { FormAlert, Spinner, TextField, Field } from '@/components/auth/fields'
import type { Address } from '@/lib/types'
import SelectMenu from '@/components/ui/SelectMenu'

const STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir',
  'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]
const STATE_OPTIONS = STATES.map((s) => ({ value: s, label: s }))
const PRESET_LABELS = ['Home', 'Work']

type Form = Omit<Address, 'id' | 'isDefault' | 'landmark'> & { landmark: string; isDefault: boolean }

const addressText = (a: Address) =>
  [a.line1, a.locality, a.landmark && `Near ${a.landmark}`, a.city, `${a.state} ${a.pincode}`].filter(Boolean).join(', ')

const displayPhone = (p: string) => p.replace(/^\+91(\d{5})(\d{5})$/, '+91 $1 $2')

function AddressForm({ existing, defaults, onSaved, onCancel }: {
  existing: Address | null
  defaults: { fullName: string; phone: string }
  onSaved: (list: Address[], message: string) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Form>(() => existing
    ? { ...existing, phone: existing.phone.replace(/^\+91/, ''), landmark: existing.landmark ?? '' }
    : { label: 'Home', fullName: defaults.fullName, phone: defaults.phone.replace(/^\+91/, ''), line1: '', locality: '', landmark: '', city: '', state: '', pincode: '', isDefault: false })
  const [customLabel, setCustomLabel] = useState(() => (existing && !PRESET_LABELS.includes(existing.label) ? true : false))
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Form>(k: K, v: Form[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const phone = form.phone.replace(/[\s-]/g, '')
    const next: typeof errors = {}
    if (form.label.trim().length < 2) next.label = 'Give this address a name (e.g. Home)'
    if (form.fullName.trim().length < 2) next.fullName = 'Enter the name of the person receiving the order'
    if (!/^(\+91)?[6-9]\d{9}$/.test(phone)) next.phone = 'Enter a valid 10-digit mobile number'
    if (form.line1.trim().length < 2) next.line1 = 'Enter the flat / house no. and building'
    if (form.locality.trim().length < 2) next.locality = 'Enter the area or locality'
    if (form.city.trim().length < 2) next.city = 'Enter the city'
    if (!form.state) next.state = 'Choose the state'
    if (!/^[1-9]\d{5}$/.test(form.pincode)) next.pincode = 'Enter a valid 6-digit pincode'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const json = { ...form, phone, label: form.label.trim(), landmark: form.landmark.trim() || null }
      const res = existing
        ? await api<{ message: string; addresses: Address[] }>(`/account/addresses/${existing.id}`, { method: 'PUT', json })
        : await api<{ message: string; addresses: Address[] }>('/account/addresses', { method: 'POST', json })
      onSaved(res.addresses, res.message)
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(false)
    }
  }

  const chip = (on: boolean) => `cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${on ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white hover:border-brand-600'}`

  return (
    <form onSubmit={submit} noValidate className='card'>
      <h2 className='text-[15px] font-bold'>{existing ? `Edit ${existing.label} address` : 'Add new address'}</h2>
      {formError && <div className='mt-4'><FormAlert>{formError}</FormAlert></div>}
      <div className='mt-4 grid gap-4 sm:grid-cols-2'>
        <div className='sm:col-span-2'>
          <span className='field-label'>Label</span>
          <div className='flex flex-wrap items-center gap-2'>
            {PRESET_LABELS.map((l) => (
              <button key={l} type='button' aria-pressed={!customLabel && form.label === l} onClick={() => { setCustomLabel(false); set('label', l) }} className={chip(!customLabel && form.label === l)}>{l}</button>
            ))}
            <button type='button' aria-pressed={customLabel} onClick={() => { setCustomLabel(true); set('label', existing && !PRESET_LABELS.includes(existing.label) ? existing.label : '') }} className={chip(customLabel)}>Other</button>
            {customLabel && (
              <input className='field max-w-48 py-1.5 text-[13px]' maxLength={20} placeholder="e.g. Mom's place" value={form.label}
                aria-label='Address name' aria-invalid={!!errors.label || undefined} onChange={(e) => set('label', e.target.value)} autoFocus />
            )}
          </div>
          {errors.label && <p className='mt-1.5 text-xs text-error'>{errors.label}</p>}
        </div>
        <TextField label='Receiver’s name' autoComplete='name' maxLength={80} value={form.fullName} error={errors.fullName} onChange={(e) => set('fullName', e.target.value)} />
        <TextField label='Phone number' type='tel' inputMode='tel' autoComplete='tel-national' maxLength={14} placeholder='98765 43210' value={form.phone} error={errors.phone} onChange={(e) => set('phone', e.target.value)} />
        <div className='sm:col-span-2'>
          <TextField label='Flat / house no., building' autoComplete='address-line1' maxLength={120} value={form.line1} error={errors.line1} onChange={(e) => set('line1', e.target.value)} />
        </div>
        <TextField label='Locality / area' autoComplete='address-line2' maxLength={120} value={form.locality} error={errors.locality} onChange={(e) => set('locality', e.target.value)} />
        <TextField label='Landmark (optional)' maxLength={120} placeholder='e.g. Near City Mall' value={form.landmark} onChange={(e) => set('landmark', e.target.value)} />
        <TextField label='City' autoComplete='address-level2' maxLength={60} value={form.city} error={errors.city} onChange={(e) => set('city', e.target.value)} />
        <Field id='address-state' label='State' error={errors.state}>
          <SelectMenu id='address-state' value={form.state} onChange={(v) => set('state', v)} options={STATE_OPTIONS}
            placeholder='Choose state' searchable searchPlaceholder='Search states' invalid={!!errors.state} />
        </Field>
        <TextField label='Pincode' inputMode='numeric' autoComplete='postal-code' maxLength={6} value={form.pincode} error={errors.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} />
        {!existing?.isDefault && (
          <label className='flex cursor-pointer items-center gap-2.5 self-end pb-2.5 text-[13px] font-semibold'>
            <input type='checkbox' className='size-4 accent-brand-600' checked={form.isDefault} onChange={(e) => set('isDefault', e.target.checked)} />
            Make this my default address
          </label>
        )}
      </div>
      <div className='mt-5 flex gap-2.5'>
        <button type='button' className='btn-outline px-5 py-2.5 text-[13px]' onClick={onCancel} disabled={busy}>Cancel</button>
        <button type='submit' className='btn-primary px-5 py-2.5 text-[13px]' disabled={busy}>{busy && <Spinner />} {existing ? 'Save changes' : 'Save address'}</button>
      </div>
    </form>
  )
}

/** My account › Saved addresses (design) */
export default function AddressesManager() {
  const { user } = useAuth()
  const [list, setList] = useState<Address[] | null>(null)
  const [editing, setEditing] = useState<Address | 'new' | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    api<Address[]>('/account/addresses').then((a) => { if (!cancelled) setList(a) })
      .catch((err) => { if (!cancelled) { setList([]); setNotice({ tone: 'error', text: errorMessage(err) }) } })
    return () => { cancelled = true }
  }, [])

  const act = async (id: string, fn: () => Promise<{ message: string; addresses: Address[] }>) => {
    setBusyId(id); setNotice(null)
    try { const r = await fn(); setList(r.addresses); setNotice({ tone: 'success', text: r.message }) } catch (err) { setNotice({ tone: 'error', text: errorMessage(err) }) } finally { setBusyId(null); setConfirmId(null) }
  }

  if (!user) return null
  if (list === null) return <div className='grid gap-3'>{[0, 1].map((i) => <div key={i} className='h-28 animate-pulse rounded-card bg-white' />)}</div>

  if (editing) {
    return (
      <div>
        <AddressForm existing={editing === 'new' ? null : editing} defaults={{ fullName: user.fullName, phone: user.phone ?? '' }}
          onCancel={() => setEditing(null)}
          onSaved={(addresses, message) => { setList(addresses); setEditing(null); setNotice({ tone: 'success', text: message }) }} />
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-3'>
      {notice && <FormAlert tone={notice.tone}>{notice.text}</FormAlert>}
      {list.length === 0 && (
        <div className='card text-center'>
          <MapPin className='mx-auto size-9 text-n-400' />
          <p className='mt-3 text-sm font-semibold'>No saved addresses yet</p>
          <p className='mt-1 text-[13px] text-n-600'>Save where you’d like your orders delivered — it makes checkout faster.</p>
        </div>
      )}
      {list.map((a) => (
        <div key={a.id} className='card flex flex-col gap-3 sm:flex-row sm:justify-between'>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 text-[13px] font-bold'>
              {a.label}
              {a.isDefault && <span className='rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-brand-700'>DEFAULT</span>}
            </div>
            <div className='mt-1.5 text-xs font-semibold'>{a.fullName} · {displayPhone(a.phone)}</div>
            <div className='mt-1 max-w-[420px] text-xs leading-relaxed text-n-600'>{addressText(a)}</div>
          </div>
          <div className='flex shrink-0 flex-wrap items-start gap-x-4 gap-y-1 text-xs font-semibold'>
            {confirmId === a.id ? (
              <span className='flex items-center gap-2'>
                <span className='text-[#B23139]'>Remove this address?</span>
                <button type='button' onClick={() => setConfirmId(null)} className='cursor-pointer text-n-600 hover:text-n-900'>Cancel</button>
                <button type='button' disabled={busyId === a.id} onClick={() => act(a.id, () => api(`/account/addresses/${a.id}`, { method: 'DELETE' }))}
                  className='cursor-pointer text-[#B23139] hover:underline'>{busyId === a.id ? 'Removing…' : 'Remove'}</button>
              </span>
            ) : (
              <>
                {!a.isDefault && (
                  <button type='button' disabled={busyId === a.id} onClick={() => act(a.id, () => api(`/account/addresses/${a.id}/default`, { method: 'PATCH' }))}
                    className='link cursor-pointer'>{busyId === a.id ? 'Saving…' : 'Set as default'}</button>
                )}
                <button type='button' onClick={() => { setEditing(a); setNotice(null) }} className='link cursor-pointer'>Edit</button>
                <button type='button' onClick={() => setConfirmId(a.id)} className='cursor-pointer text-n-600 hover:text-[#B23139]'>Remove</button>
              </>
            )}
          </div>
        </div>
      ))}
      {list.length < 20 && (
        <button type='button' onClick={() => { setEditing('new'); setNotice(null) }}
          className='flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-n-200 bg-white/50 p-3.5 text-[13px] font-semibold text-brand-600 hover:border-brand-600'>
          <Plus className='size-4' /> Add new address
        </button>
      )}
    </div>
  )
}
