'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'

/** Header cart icon with the item count (design) */
export default function CartButton() {
  const { count } = useCart()
  return (
    <Link href='/cart' aria-label={count ? `Cart, ${count} ${count === 1 ? 'item' : 'items'}` : 'Cart'}
      className='relative flex size-10 items-center justify-center rounded-lg text-n-900 hover:bg-n-50'>
      <ShoppingCart className='size-5' />
      {count > 0 && (
        <span className='absolute top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-600 px-1 text-[9px] font-bold text-white tabular-nums'>
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  )
}
