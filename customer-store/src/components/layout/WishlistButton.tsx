'use client'

import Link from 'next/link'
import { Heart } from 'lucide-react'
import { useWishlist } from '@/lib/wishlist/WishlistProvider'

/** Header heart with the number of saved items */
export default function WishlistButton() {
  const { count } = useWishlist()
  return (
    <Link href='/wishlist' aria-label={count ? `Wishlist, ${count} ${count === 1 ? 'item' : 'items'}` : 'Wishlist'}
      className='relative flex size-10 items-center justify-center rounded-lg text-n-900 hover:bg-n-50'>
      <Heart className='size-5' />
      {count > 0 && (
        <span className='absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white tabular-nums'>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
