import type { Metadata } from 'next'
import SignupForm from '@/components/auth/SignupForm'
import GuestOnly from '@/components/auth/GuestOnly'

export const metadata: Metadata = { title: 'Create account' }

export default function SignupPage() {
  return <GuestOnly><SignupForm /></GuestOnly>
}
