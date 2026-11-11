import Link from 'next/link'
import CategoryThumb from './CategoryThumb'
import type { PublicCategory } from '@/lib/types'

/** "Shop by category" — 4 columns on desktop, as in the design */
export default function CategoryGrid({ categories }: { categories: PublicCategory[] }) {
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4'>
      {categories.map((c, i) => (
        <Link key={c.id} href={`/category/${c.slug}`}
          className='flex flex-col items-start gap-2.5 rounded-card border border-n-200 bg-white px-3.5 py-4 transition-colors hover:border-brand-600 hover:bg-brand-100/50'>
          <CategoryThumb name={c.name} slug={c.slug} iconUrl={c.iconUrl} size='size-10' rounded='rounded-[11px]' tint={i % 2 ? 'bg-n-100' : 'bg-brand-100'} iconClass='size-5' />
          <span className='w-full min-w-0'>
            <span className='block truncate text-[13px] font-bold'>{c.name}</span>
            <span className='mt-0.5 block text-[11px] text-n-600'>{c.productsCount} {c.productsCount === 1 ? 'item' : 'items'}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
