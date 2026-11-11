import { redirect } from 'next/navigation'

/** Moved to /help (standalone, like the wishlist) */
export default function MovedHelp() {
  redirect('/help')
}
