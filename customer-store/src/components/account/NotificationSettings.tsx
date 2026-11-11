'use client'

import { useEffect, useState } from 'react'
import { api, errorMessage } from '@/lib/auth/client'
import { FormAlert } from '@/components/auth/fields'
import type { NotificationPrefs } from '@/lib/types'

const TOPICS: { key: keyof NotificationPrefs['topics']; label: string; hint: string }[] = [
  { key: 'orderUpdates', label: 'Order updates', hint: 'Confirmations, dispatch, delivery and returns' },
  { key: 'promotions', label: 'Promotions & offers', hint: 'Sales, coupons and deals' },
  { key: 'priceDrops', label: 'Price drop alerts', hint: 'When something in your wishlist gets cheaper' },
  { key: 'newArrivals', label: 'New arrivals', hint: 'New products in categories you shop' },
]
const CHANNELS: { key: keyof NotificationPrefs['channels']; label: string; hint: string }[] = [
  { key: 'push', label: 'Push notifications', hint: 'On this device and the app' },
  { key: 'email', label: 'Email', hint: 'To your account email' },
  { key: 'sms', label: 'SMS', hint: 'To your phone number' },
]

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: (v: boolean) => void }) {
  return (
    <button type='button' role='switch' aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-n-200'}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

/** My account › Notification settings (design): saved as soon as a switch changes */
export default function NotificationSettings() {
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api<NotificationPrefs>('/account/notification-settings').then((p) => { if (!cancelled) setPrefs(p) })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)) })
    return () => { cancelled = true }
  }, [])

  const save = async (next: NotificationPrefs) => {
    const prev = prefs
    setPrefs(next)
    setStatus('saving')
    try {
      await api('/account/notification-settings', { method: 'PUT', json: next })
      setStatus('saved')
    } catch (err) {
      setPrefs(prev)
      setStatus('error')
      setError(errorMessage(err))
    }
  }

  if (!prefs) {
    return error ? <FormAlert>{error}</FormAlert> : <div className='h-80 animate-pulse rounded-card bg-white' />
  }

  const section = <G extends 'topics' | 'channels'>(group: G, title: string, rows: { key: keyof NotificationPrefs[G]; label: string; hint: string }[]) => (
    <section className='card py-2 sm:py-2'>
      <h2 className='pt-3 pb-1 text-sm font-bold'>{title}</h2>
      {rows.map((r) => {
        const on = prefs[group][r.key] as boolean
        return (
          <div key={String(r.key)} className='flex items-center justify-between gap-4 border-b border-n-200 py-3.5 last:border-0'>
            <span>
              <span className='block text-[13px] font-semibold'>{r.label}</span>
              <span className='block text-xs text-n-600'>{r.hint}</span>
            </span>
            <Toggle on={on} label={r.label} onChange={(v) => save({ ...prefs, [group]: { ...prefs[group], [r.key]: v } })} />
          </div>
        )
      })}
    </section>
  )

  return (
    <div className='flex flex-col gap-4'>
      <span className='-mt-2 h-4 text-right text-xs text-n-600' aria-live='polite'>{status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ''}</span>
      {status === 'error' && <FormAlert>{error}</FormAlert>}
      {section('topics', 'What you get notified about', TOPICS)}
      {section('channels', 'How you get notified', CHANNELS)}
      <p className='text-xs text-n-600'>Important messages about your account and payments are always sent.</p>
    </div>
  )
}
