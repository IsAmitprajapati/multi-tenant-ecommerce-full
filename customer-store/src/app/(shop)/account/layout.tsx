import type { Metadata } from 'next'
import AccountShell from '@/components/account/AccountShell'

export const metadata: Metadata = { title: 'My account' }

// Rendered on the client once the saved session is read, so skip instant-navigation validation
export const instant = false

export default function AccountLayout({ children }: LayoutProps<'/account'>) {
  return <AccountShell>{children}</AccountShell>
}
