'use client'

import Link from 'next/link'
import { UserRound } from 'lucide-react'
import { useAuth } from '@/lib/auth/AuthProvider'
import { initials } from '@/lib/format'

/** Header account entry: avatar when signed in, "Log in" otherwise */
export default function UserMenu() {
  const { status, user } = useAuth()

  if (status === 'loading') return <span className='size-9 animate-pulse rounded-full bg-n-100' aria-hidden />

  if (status === 'authenticated' && user) {
    return (
      <Link href='/account' className='flex items-center gap-2 rounded-full p-0.5 pr-0.5 hover:bg-n-50 sm:pr-3' aria-label='My account'>
        <span className='flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700'>{initials(user.fullName)}</span>
        <span className='hidden max-w-32 truncate text-sm font-semibold sm:block'>{user.fullName.split(' ')[0]}</span>
      </Link>
    )
  }

  return (
    <Link href='/login' className='flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-n-900 hover:bg-n-50'>
      <UserRound className='size-[18px]' /> <span>Log in</span>
    </Link>
  )
}
