'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Signed-in shoppers skip the login/signup screens */
export default function GuestOnly({ children, redirectTo = '/account' }: { children: React.ReactNode; redirectTo?: string }) {
  const { status } = useAuth()
  const router = useRouter()
  useEffect(() => { if (status === 'authenticated') router.replace(redirectTo) }, [status, router, redirectTo])
  if (status === 'authenticated') return null
  return <>{children}</>
}
