import AccountPage from '@/components/account/AccountPage'
import ProfileForm from '@/components/account/ProfileForm'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export default function AccountProfilePage() {
  return (
    <AccountPage title='Profile' description='Your personal details.'>
      <ProfileForm />
    </AccountPage>
  )
}
