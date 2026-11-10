import Link from 'next/link'
import CategoryIcon from './CategoryIcon'
import type { PublicCategory } from '@/lib/types'

export default function CategoryGrid({ categories }: { categories: PublicCategory[] }) {
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-4 xl:grid-cols-6'>
      {categories.map((c, i) => (
        <Link key={c.id} href={`/category/${c.slug}`}
          className='flex flex-col items-start gap-2.5 rounded-card border border-n-200 bg-white px-3.5 py-4 transition-colors hover:border-brand-600 hover:bg-brand-100/50'>
          <span className={`flex size-10 items-center justify-center rounded-[11px] text-brand-700 ${i % 2 ? 'bg-n-100' : 'bg-brand-100'}`}>
            <CategoryIcon name={`${c.name} ${c.slug}`} className='size-5' />
          </span>
          <span>
            <span className='block text-[13px] font-bold'>{c.name}</span>
            <span className='mt-0.5 block text-[11px] text-n-600'>{c.productsCount} {c.productsCount === 1 ? 'item' : 'items'}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}
