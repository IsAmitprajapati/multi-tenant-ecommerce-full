import { redirect } from 'next/navigation'

/** Moved to /about (standalone, like the wishlist) */
export default function MovedAbout() {
  redirect('/about')
}
