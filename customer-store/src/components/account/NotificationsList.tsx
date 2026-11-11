'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BellOff, Package, Tag, UserRound, type LucideIcon } from 'lucide-react'
import { api, errorMessage } from '@/lib/auth/client'
import { FormAlert } from '@/components/auth/fields'
import { UNREAD_EVENT } from './AccountShell'
import type { AppNotification } from '@/lib/types'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'orders', label: 'Orders' },
  { id: 'offers', label: 'Offers' },
  { id: 'account', label: 'Account' },
] as const
type Filter = (typeof FILTERS)[number]['id']

const ICONS: Record<AppNotification['category'], LucideIcon> = { ORDERS: Package, OFFERS: Tag, ACCOUNT: UserRound }

/** "2 hours ago" */
function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  const units: [number, string][] = [[31_536_000, 'year'], [2_592_000, 'month'], [604_800, 'week'], [86_400, 'day'], [3_600, 'hour'], [60, 'minute']]
  for (const [secs, name] of units) {
    const n = Math.floor(s / secs)
    if (n >= 1) return `${n} ${name}${n > 1 ? 's' : ''} ago`
  }
  return 'Just now'
}

/** My account › Notifications (design) */
export default function NotificationsList() {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [unread, setUnread] = useState(0)
  const [error, setError] = useState('')

  const publishUnread = (n: number) => { setUnread(n); window.dispatchEvent(new CustomEvent(UNREAD_EVENT, { detail: n })) }

  useEffect(() => {
    let cancelled = false
    api<{ items: AppNotification[]; unread: number }>(`/account/notifications?category=${filter}`)
      .then((r) => { if (!cancelled) { setItems(r.items); publishUnread(r.unread) } })
      .catch((err) => { if (!cancelled) { setItems([]); setError(errorMessage(err)) } })
    return () => { cancelled = true }
  }, [filter])

  const open = async (n: AppNotification) => {
    if (!n.readAt) {
      setItems((list) => list?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ?? null)
      api<{ unread: number }>(`/account/notifications/${n.id}/read`, { method: 'PATCH' }).then((r) => publishUnread(r.unread)).catch(() => {})
    }
    if (n.link) router.push(n.link)
  }

  const markAll = async () => {
    setItems((list) => list?.map((x) => ({ ...x, readAt: x.readAt ?? new Date().toISOString() })) ?? null)
    try { await api('/account/notifications/read-all', { method: 'POST' }); publishUnread(0) } catch (err) { setError(errorMessage(err)) }
  }

  return (
    <div>
      <div className='flex items-center justify-between gap-3'>
      <div className='no-scrollbar flex gap-2 overflow-x-auto' role='tablist' aria-label='Filter notifications'>
        {FILTERS.map((f) => (
          <button key={f.id} type='button' role='tab' aria-selected={filter === f.id} onClick={() => { setFilter(f.id); setItems(null) }}
            className={`shrink-0 cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${filter === f.id ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white hover:border-brand-600'}`}>
            {f.label}
          </button>
        ))}
      </div>
        {unread > 0 && <button type='button' onClick={markAll} className='link shrink-0 cursor-pointer text-xs'>Mark all as read</button>}
      </div>
      {error && <div className='mt-3'><FormAlert>{error}</FormAlert></div>}
      <div className='mt-4 overflow-hidden rounded-card border border-n-200 bg-white'>
        {items === null ? (
          [0, 1, 2].map((i) => <div key={i} className='h-[68px] animate-pulse border-b border-n-200 bg-n-50 last:border-0' />)
        ) : items.length === 0 ? (
          <div className='px-6 py-12 text-center'>
            <BellOff className='mx-auto size-9 text-n-400' />
            <p className='mt-3 text-sm font-semibold'>{filter === 'all' ? 'No notifications yet' : `No ${filter} notifications`}</p>
            <p className='mt-1 text-[13px] text-n-600'>{filter === 'orders' ? 'Order updates will show up here once you place an order.' : filter === 'offers' ? 'Offers and price drops will show up here.' : 'We’ll let you know about your account and orders here.'}</p>
          </div>
        ) : items.map((n) => {
          const Icon = ICONS[n.category]
          return (
            <button key={n.id} type='button' onClick={() => open(n)}
              className={`flex w-full cursor-pointer items-start gap-3 border-b border-n-200 px-4 py-3.5 text-left last:border-0 hover:bg-n-50 ${n.readAt ? 'bg-white' : 'bg-n-50'}`}>
              <span className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700'><Icon className='size-4' /></span>
              <span className='min-w-0 flex-1'>
                <span className={`block text-[13px] ${n.readAt ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                {n.body && <span className='mt-0.5 block text-xs text-n-600'>{n.body}</span>}
                <span className='mt-1 block text-[11px] text-n-600'>{timeAgo(n.createdAt)}</span>
              </span>
              {!n.readAt && <span className='mt-2 size-2 shrink-0 rounded-full bg-brand-600' aria-label='Unread' />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
