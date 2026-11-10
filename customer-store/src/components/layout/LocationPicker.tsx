'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronDown, MapPin, X } from 'lucide-react'

/**
 * "Deliver to" location in the header. Saved per browser for now; once addresses and
 * serviceability exist, product lists will filter by this pincode.
 */
export interface DeliveryLocation { pincode: string; label: string }

const KEY = 'marketplace.location'
const EVENT = 'marketplace:location'

function readLocation(): DeliveryLocation | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    return v && /^\d{6}$/.test(v.pincode) ? { pincode: v.pincode, label: String(v.label ?? '').slice(0, 40) } : null
  } catch { return null }
}

let cached: { raw: string | null; value: DeliveryLocation | null } = { raw: null, value: null }
function snapshot() {
  let raw: string | null = null
  try { raw = localStorage.getItem(KEY) } catch { /* blocked */ }
  if (raw !== cached.raw) cached = { raw, value: readLocation() }
  return cached.value
}
function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) cb() }
  window.addEventListener('storage', onStorage)
  window.addEventListener(EVENT, cb)
  return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, cb) }
}

export function useDeliveryLocation() {
  return useSyncExternalStore(subscribe, snapshot, () => null)
}

export function saveDeliveryLocation(loc: DeliveryLocation) {
  try { localStorage.setItem(KEY, JSON.stringify(loc)) } catch { /* blocked */ }
  window.dispatchEvent(new Event(EVENT))
}

export default function LocationPicker({ compact = false }: { compact?: boolean }) {
  const location = useDeliveryLocation()
  const ref = useRef<HTMLDialogElement>(null)
  const [open, setOpen] = useState(false)
  const [pincode, setPincode] = useState('')
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const openPicker = () => {
    setPincode(location?.pincode ?? '')
    setLabel(location?.label ?? '')
    setError('')
    setOpen(true)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[1-9]\d{5}$/.test(pincode)) { setError('Enter a valid 6-digit pincode'); return }
    saveDeliveryLocation({ pincode, label: label.trim() })
    setOpen(false)
  }

  const text = location ? (location.label ? `${location.label} ${location.pincode}` : location.pincode) : 'Select location'

  return (
    <>
      <button type='button' onClick={openPicker} aria-haspopup='dialog'
        className={`flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg bg-n-50 px-3 py-2 text-left hover:bg-n-100 ${compact ? 'w-full' : 'max-w-[240px] shrink'}`}>
        <MapPin className='size-4 shrink-0 text-brand-600' />
        <span className='min-w-0 truncate text-[13px]'>
          <span className='text-n-600'>Deliver to </span>
          <span className='font-semibold'>{text}</span>
        </span>
        <ChevronDown className='size-4 shrink-0 text-n-600' />
      </button>

      <dialog ref={ref} onClose={() => setOpen(false)} onClick={(e) => { if (e.target === ref.current) setOpen(false) }}
        aria-labelledby='location-title'
        className='m-auto w-[min(420px,calc(100vw-32px))] rounded-card bg-white p-6 text-n-900 backdrop:bg-n-900/50'>
        <form onSubmit={save} noValidate>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h2 id='location-title' className='text-lg font-bold'>Choose your delivery location</h2>
              <p className='mt-1 text-[13px] text-n-600'>Stores deliver to specific pincodes. We’ll use this to show what can reach you.</p>
            </div>
            <button type='button' onClick={() => setOpen(false)} aria-label='Close' className='-mt-1 -mr-2 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-n-600 hover:bg-n-50'>
              <X className='size-5' />
            </button>
          </div>
          <div className='mt-5 grid gap-3.5'>
            <div>
              <label htmlFor='loc-pincode' className='field-label'>Pincode</label>
              <input id='loc-pincode' className='field tracking-wider' inputMode='numeric' autoComplete='postal-code' maxLength={6} placeholder='e.g. 560034'
                value={pincode} aria-invalid={!!error || undefined} autoFocus
                onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')); setError('') }} />
              {error && <p className='mt-1.5 text-xs text-error'>{error}</p>}
            </div>
            <div>
              <label htmlFor='loc-label' className='field-label'>Area or city (optional)</label>
              <input id='loc-label' className='field' maxLength={40} placeholder='e.g. Koramangala, BLR' autoComplete='address-level2'
                value={label} onChange={(e) => setLabel(e.target.value)} />
            </div>
          </div>
          <button type='submit' className='btn-primary mt-5 w-full'>Save location</button>
        </form>
      </dialog>
    </>
  )
}
