import type { Metadata } from 'next'
import AccountPage from '@/components/account/AccountPage'
import AddressesManager from '@/components/account/AddressesManager'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export const metadata: Metadata = { title: 'Saved addresses' }

export default function AddressesPage() {
  return (
    <AccountPage title='Saved addresses' description='Where you’d like your orders delivered.'>
      <AddressesManager />
    </AccountPage>
  )
}
