import type { Metadata } from 'next'
import AccountPage from '@/components/account/AccountPage'
import NotificationsList from '@/components/account/NotificationsList'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <AccountPage title='Notifications' description='Updates about your orders, offers and account.'>
      <NotificationsList />
    </AccountPage>
  )
}
