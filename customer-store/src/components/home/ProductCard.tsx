import Image from 'next/image'
import Link from 'next/link'
import { ImageOff } from 'lucide-react'
import { inr, productHref } from '@/lib/format'
import { RatingChip } from '@/components/reviews/Stars'
import type { ProductCard as Card } from '@/lib/types'

/** Product tile — links to the product page */
export default function ProductCard({ p, className = '' }: { p: Card; className?: string }) {
  return (
    <Link href={productHref(p)} className={`group flex flex-col overflow-hidden rounded-xl border border-n-200 bg-white transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(12,31,22,.25)] ${className}`}>
      <div className='relative aspect-[19/13] bg-n-100'>
        {p.imageUrl
          ? <Image src={p.imageUrl} alt={p.title} fill sizes='(min-width: 1024px) 220px, 45vw' className={`object-cover ${p.inStock ? '' : 'opacity-60 grayscale'}`} />
          : <span className='flex size-full items-center justify-center text-n-400'><ImageOff className='size-6' /></span>}
        {p.discountPercent > 0 && (
          <span className='absolute top-2.5 left-2.5 rounded-full bg-lime-500 px-2 py-[3px] text-[11px] font-bold text-brand-800'>-{p.discountPercent}%</span>
        )}
        {!p.inStock && (
          <span className='absolute bottom-2 left-2 rounded-full bg-n-900/70 px-2 py-[3px] text-[10px] font-bold text-white'>Out of stock</span>
        )}
      </div>
      <div className='flex flex-1 flex-col p-3'>
        <div className='truncate text-[10.5px] font-semibold text-brand-600'>{p.seller.name}</div>
        <h3 className='mt-0.5 line-clamp-2 text-[13px] leading-snug font-semibold group-hover:text-brand-700'>{p.title}</h3>
        {p.rating != null && (
          <div className='mt-1 flex items-center gap-1.5'>
            <RatingChip value={p.rating} />
            <span className='text-[11px] text-n-600'>({p.ratingCount})</span>
          </div>
        )}
        <div className='mt-auto flex items-baseline gap-1.5 pt-1.5'>
          {p.hasVariants && <span className='text-[11px] text-n-600'>from</span>}
          <span className='text-sm font-bold'>{inr(p.price)}</span>
          {p.mrp && <span className='text-xs text-n-600 line-through'>{inr(p.mrp)}</span>}
        </div>
      </div>
    </Link>
  )
}
