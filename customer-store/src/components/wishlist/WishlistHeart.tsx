'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { useWishlist } from '@/lib/wishlist/WishlistProvider'

/** Save / unsave a product. `overlay` = white circle on a card photo (design); `inline` = button with text */
export default function WishlistHeart({ productId, title, variant = 'overlay', className = '' }: {
  productId: string
  title: string
  variant?: 'overlay' | 'inline'
  className?: string
}) {
  const { has, toggle } = useWishlist()
  const [error, setError] = useState(false)
  const saved = has(productId)
  const label = saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`

  const click = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setError(false)
    try { await toggle(productId) } catch { setError(true) }
  }

  if (variant === 'inline') {
    return (
      <button type='button' onClick={click} aria-pressed={saved} aria-label={label}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] px-3 py-2 text-xs font-semibold transition-colors ${saved ? 'border-[#E5484D]/40 bg-[#E5484D]/5 text-[#B23139]' : 'border-n-200 bg-white text-n-900 hover:border-brand-600'} ${className}`}>
        <Heart className={`size-4 ${saved ? 'fill-[#E5484D] text-[#E5484D]' : ''}`} />
        {saved ? 'Saved' : 'Save'}{error && <span className='text-error'> · try again</span>}
      </button>
    )
  }

  return (
    <button type='button' onClick={click} aria-pressed={saved} aria-label={label} title={error ? 'Couldn’t update — try again' : label}
      className={`flex size-[30px] cursor-pointer items-center justify-center rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,.15)] transition-transform hover:scale-110 ${className}`}>
      <Heart className={`size-4 ${saved ? 'fill-[#E5484D] text-[#E5484D]' : error ? 'text-error' : 'text-n-600'}`} />
    </button>
  )
}
