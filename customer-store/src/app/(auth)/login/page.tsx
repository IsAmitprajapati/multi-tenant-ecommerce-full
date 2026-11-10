import { Suspense } from 'react'
import type { Metadata } from 'next'
import LoginForm from '@/components/auth/LoginForm'
import GuestOnly from '@/components/auth/GuestOnly'

export const metadata: Metadata = { title: 'Log in' }

export default function LoginPage() {
  return (
    <GuestOnly>
      <Suspense><LoginForm /></Suspense>
    </GuestOnly>
  )
}
