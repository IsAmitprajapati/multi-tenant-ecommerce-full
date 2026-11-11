import type { Metadata } from 'next'
import WishlistView from '@/components/wishlist/WishlistView'

export const metadata: Metadata = { title: 'My wishlist' }

export default function WishlistPage() {
  return <WishlistView />
}
