'use client'

import { useCallback, useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'
import { api, errorMessage } from '@/lib/auth/client'
import { FormAlert, Spinner } from '@/components/auth/fields'
import type { UserSessionRow } from '@/lib/types'

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export default function SessionsList() {
  const [rows, setRows] = useState<UserSessionRow[] | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    api<UserSessionRow[]>('/auth/sessions').then(setRows).catch((err) => { setError(errorMessage(err)); setRows([]) })
  }, [])
  useEffect(() => { load() }, [load])

  const revoke = async (id: string | 'others') => {
    setBusy(id)
    setError('')
    try {
      await api(id === 'others' ? '/auth/sessions/revoke-others' : `/auth/sessions/${id}/revoke`, { method: 'POST' })
      load()
    } catch (err) {
      setError(errorMessage(err))
    } finally { setBusy(null) }
  }

  const others = rows?.filter((r) => !r.isCurrent).length ?? 0

  return (
    <div className='card max-w-[680px]'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
        <div>
          <h1 className='text-base font-bold'>Signed-in devices</h1>
          <p className='mt-1 text-[13px] text-n-600'>Log out of any device you don’t recognise.</p>
        </div>
        {others > 0 && (
          <button type='button' className='btn-outline shrink-0 px-4 py-2 text-[13px]' onClick={() => revoke('others')} disabled={!!busy}>
            {busy === 'others' && <Spinner />} Log out other devices
          </button>
        )}
      </div>
      {error && <div className='mt-4'><FormAlert>{error}</FormAlert></div>}
      <ul className='mt-4'>
        {rows === null && Array.from({ length: 2 }).map((_, i) => <li key={i} className='my-2 h-14 animate-pulse rounded-lg bg-n-50' />)}
        {rows?.map((s) => (
          <li key={s.id} className='flex items-center gap-3 border-b border-n-200 py-3.5 last:border-0'>
            <span className='flex size-10 shrink-0 items-center justify-center rounded-lg bg-n-50 text-n-600'><Monitor className='size-5' /></span>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 text-sm font-semibold'>
                <span className='truncate'>{s.deviceLabel || 'Web browser'}</span>
                {s.isCurrent && <span className='shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-700'>This device</span>}
              </div>
              <div className='truncate text-xs text-n-600'>Active {when(s.lastActiveAt)}{s.ipAddress ? ` · ${s.ipAddress}` : ''}</div>
            </div>
            {!s.isCurrent && (
              <button type='button' className='link shrink-0 text-[13px] disabled:opacity-60' onClick={() => revoke(s.id)} disabled={!!busy}>
                {busy === s.id ? 'Logging out…' : 'Log out'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
