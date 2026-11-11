'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell, BellRing, CreditCard, Heart, Info, LifeBuoy, LogOut, MapPin, ShieldCheck, UserRound, Wallet, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api } from '@/lib/auth/client'
import { initials } from '@/lib/format'
import { Spinner } from '@/components/auth/fields'

/** Account menu (design order) */
const NAV: { href: string; label: string; Icon: LucideIcon; badge?: 'unread' }[] = [
  { href: '/account', label: 'Profile', Icon: UserRound },
  { href: '/account/security', label: 'Login & security', Icon: ShieldCheck },
  { href: '/account/addresses', label: 'Saved addresses', Icon: MapPin },
  { href: '/wishlist', label: 'Wishlist', Icon: Heart },
  { href: '/account/wallet', label: 'Wallet & coupons', Icon: Wallet },
  { href: '/account/payments', label: 'Payment methods', Icon: CreditCard },
  { href: '/account/notifications', label: 'Notifications', Icon: Bell, badge: 'unread' },
  { href: '/account/notification-settings', label: 'Notification settings', Icon: BellRing },
  { href: '/help', label: 'Help & chat support', Icon: LifeBuoy },
  { href: '/about', label: 'About & policies', Icon: Info },
]


/** Unread count shared with the Notifications page (it fires this event when it changes) */
export const UNREAD_EVENT = 'marketplace:notifications-unread'

function LogoutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { logout } = useAuth()
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current && !busy) onClose() }}
      className='m-auto w-[min(340px,calc(100vw-32px))] rounded-2xl bg-white p-7 text-center text-n-900 backdrop:bg-n-900/45'>
      <h2 className='text-base font-bold'>Log out?</h2>
      <p className='mt-2 text-[13px] text-n-600'>You’ll need to log in again to see your account and orders.</p>
      <div className='mt-5 flex gap-2.5'>
        <button type='button' className='btn-outline flex-1 px-4 py-2.5 text-[13px]' onClick={onClose} disabled={busy}>Cancel</button>
        <button type='button' className='btn flex-1 bg-error px-4 py-2.5 text-[13px] text-white hover:bg-[#cf3f44]' disabled={busy}
          onClick={async () => { setBusy(true); await logout(); router.replace('/') }}>
          {busy && <Spinner />} Log out
        </button>
      </div>
    </dialog>
  )
}

/** Signed-in area: account menu (design) + page; guests are sent to log in */
export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [unread, setUnread] = useState(0)
  const signedIn = status === 'authenticated' && !!user

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [status, router, pathname])

  // Unread notifications badge
  useEffect(() => {
    if (!signedIn) return
    let cancelled = false
    api<{ unread: number }>('/account/notifications').then((r) => { if (!cancelled) setUnread(r.unread) }).catch(() => {})
    const on = (e: Event) => setUnread((e as CustomEvent<number>).detail)
    window.addEventListener(UNREAD_EVENT, on)
    return () => { cancelled = true; window.removeEventListener(UNREAD_EVENT, on) }
  }, [signedIn])

  const container = 'mx-auto w-full max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'

  if (!signedIn) {
    return (
      <div className={`${container} flex gap-6`}>
        <div className='hidden h-[520px] w-[280px] shrink-0 animate-pulse rounded-card bg-white md:block' />
        <div className='h-96 flex-1 animate-pulse rounded-card bg-white' />
      </div>
    )
  }

  const active = NAV.find((n) => n.href === pathname)

  return (
    <div className={container}>
      <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
        <Link href='/account' className='hover:text-brand-600'>Account</Link>
        {active && active.href !== '/account' && <> / <span className='font-semibold text-n-900'>{active.label}</span></>}
      </nav>
      <div className='mt-4 flex flex-col gap-5 md:flex-row md:gap-6'>
        <aside className='shrink-0 rounded-card border border-n-200 bg-white p-4 md:sticky md:top-[92px] md:w-[280px] md:self-start'>
          <div className='flex items-center gap-3 px-2.5 pt-2 pb-4'>
            <span className='flex size-[46px] shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700'>{initials(user.fullName)}</span>
            <div className='min-w-0'>
              <div className='truncate text-sm font-bold'>{user.fullName}</div>
              <div className='truncate text-xs text-n-600'>{user.phone ?? user.email}</div>
            </div>
          </div>
          <nav className='no-scrollbar flex gap-0.5 overflow-x-auto md:flex-col' aria-label='Account'>
            {NAV.map(({ href, label, Icon, badge }) => {
              const on = pathname === href
              return (
                <Link key={href} href={href} aria-current={on ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${on ? 'bg-brand-100 text-[#155C3B]' : 'text-n-900 hover:bg-n-50'}`}>
                  <Icon className='size-[18px]' />
                  <span className='flex-1'>{label}</span>
                  {badge === 'unread' && unread > 0 && (
                    <span className='rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white tabular-nums' aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>
                  )}
                </Link>
              )
            })}
            <button type='button' onClick={() => setConfirmLogout(true)}
              className='flex shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-left text-[13px] font-semibold text-[#B23139] hover:bg-error/5'>
              <LogOut className='size-[18px]' /> Log out
            </button>
          </nav>
        </aside>
        <div className='min-w-0 flex-1'>{children}</div>
      </div>
      <LogoutDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} />
    </div>
  )
}
