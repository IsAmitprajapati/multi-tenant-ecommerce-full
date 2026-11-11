import type { Metadata } from 'next'
import AccountPage from '@/components/account/AccountPage'
import NotificationSettings from '@/components/account/NotificationSettings'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export const metadata: Metadata = { title: 'Notification settings' }

export default function NotificationSettingsPage() {
  return (
    <AccountPage title='Notification settings' description='Choose what you hear about and how.'>
      <NotificationSettings />
    </AccountPage>
  )
}
