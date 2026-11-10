import { Suspense } from 'react'
import type { Metadata } from 'next'
import ResetPasswordForm from '@/components/auth/ResetPasswordForm'

export const metadata: Metadata = { title: 'Reset password' }

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>
}
