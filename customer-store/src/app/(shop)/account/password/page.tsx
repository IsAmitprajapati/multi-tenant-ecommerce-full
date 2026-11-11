import { redirect } from 'next/navigation'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

/** Moved into My account › Login & security */
export default function MovedPage() {
  redirect('/account/security')
}
