'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth/AuthProvider'

/** Only same-site paths (keeps the #hash, e.g. #write-review) */
const safeNext = (v: string | null) => (v && v.startsWith('/') && !v.startsWith('//') ? v : null)

/**
 * Signed-in shoppers skip the login/signup screens. They go where `?next=` points
 * (e.g. back to the product they were reviewing), otherwise to `redirectTo`.
 */
export default function GuestOnly({ children, redirectTo = '/account' }: { children: React.ReactNode; redirectTo?: string }) {
  const { status } = useAuth()
  const router = useRouter()
  useEffect(() => {
    if (status !== 'authenticated') return
    const next = safeNext(new URLSearchParams(window.location.search).get('next'))
    router.replace(next ?? redirectTo)
  }, [status, router, redirectTo])
  if (status === 'authenticated') return null
  return <>{children}</>
}
