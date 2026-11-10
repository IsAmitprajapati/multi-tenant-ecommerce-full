'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { KeyRound, LogOut, MonitorSmartphone, UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { initials } from '@/lib/format'
import { Spinner } from '@/components/auth/fields'

const NAV = [
  { href: '/account', label: 'Profile', Icon: UserRound },
  { href: '/account/password', label: 'Password', Icon: KeyRound },
  { href: '/account/sessions', label: 'Signed-in devices', Icon: MonitorSmartphone },
]

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
      className='m-auto w-[min(400px,calc(100vw-32px))] rounded-card bg-white p-6 text-n-900 backdrop:bg-n-900/50'>
      <h2 className='text-lg font-bold'>Log out?</h2>
      <p className='mt-1.5 text-sm text-n-600'>You’ll need to log in again to see your account and orders.</p>
      <div className='mt-6 flex justify-end gap-2.5'>
        <button type='button' className='btn-outline px-4 py-2.5' onClick={onClose} disabled={busy}>Cancel</button>
        <button type='button' className='btn px-4 py-2.5 bg-error text-white hover:bg-[#cf3f44]' disabled={busy}
          onClick={async () => { setBusy(true); await logout(); router.replace('/') }}>
          {busy && <Spinner />} Log out
        </button>
      </div>
    </dialog>
  )
}

/** Signed-in area: redirects guests to /login and shows the account menu */
export default function AccountShell({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [confirmLogout, setConfirmLogout] = useState(false)

  useEffect(() => {
    if (status === 'guest') router.replace(`/login?next=${encodeURIComponent(pathname)}`)
  }, [status, router, pathname])

  if (status !== 'authenticated' || !user) {
    return (
      <div className='mx-auto flex max-w-[1200px] gap-6 px-4 py-8 sm:px-8'>
        <div className='hidden h-80 w-[280px] shrink-0 animate-pulse rounded-card bg-white md:block' />
        <div className='h-96 flex-1 animate-pulse rounded-card bg-white' />
      </div>
    )
  }

  return (
    <div className='mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-6 sm:px-8 md:flex-row md:gap-6 md:py-8'>
      <aside className='shrink-0 rounded-card border border-n-200 bg-white p-4 md:w-[280px] md:self-start'>
        <div className='flex items-center gap-3 px-2.5 pt-2 pb-4'>
          <span className='flex size-[46px] shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700'>{initials(user.fullName)}</span>
          <div className='min-w-0'>
            <div className='truncate text-sm font-bold'>{user.fullName}</div>
            <div className='truncate text-xs text-n-600'>{user.phone ?? user.email}</div>
          </div>
        </div>
        <nav className='no-scrollbar flex gap-0.5 overflow-x-auto md:flex-col' aria-label='Account'>
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-[13px] font-semibold ${active ? 'bg-brand-100 text-brand-700' : 'text-n-900 hover:bg-n-50'}`}>
                <Icon className='size-[18px]' /> {label}
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
      <LogoutDialog open={confirmLogout} onClose={() => setConfirmLogout(false)} />
    </div>
  )
}
