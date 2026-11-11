import type { Metadata } from 'next'
import AccountPage from '@/components/account/AccountPage'
import PasswordForm from '@/components/account/PasswordForm'
import SessionsList from '@/components/account/SessionsList'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export const metadata: Metadata = { title: 'Login & security' }

/** My account › Login & security: password + signed-in devices */
export default function SecurityPage() {
  return (
    <AccountPage title='Login & security' description='Change your password and see where you’re signed in.'>
      <PasswordForm />
      <SessionsList />
    </AccountPage>
  )
}
