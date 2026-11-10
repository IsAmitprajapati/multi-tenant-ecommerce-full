import type { Metadata } from 'next'
import Link from 'next/link'
import CategoryIcon from '@/components/home/CategoryIcon'
import { getCategories } from '@/lib/public-api'

export const metadata: Metadata = { title: 'All categories' }

export default async function CategoriesPage() {
  const categories = await getCategories()
  return (
    <div className='mx-auto max-w-[1200px] px-4 py-7 sm:px-8'>
      <h1 className='text-2xl font-bold'>All categories</h1>
      <p className='mt-1 text-sm text-n-600'>Browse everything sold across our stores.</p>
      {categories.length === 0 && <p className='card mt-6 text-center text-sm text-n-600'>No categories yet.</p>}
      <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {categories.map((c) => (
          <div key={c.id} className='card'>
            <Link href={`/category/${c.slug}`} className='group flex items-center gap-3'>
              <span className='flex size-11 items-center justify-center rounded-[11px] bg-brand-100 text-brand-700'>
                <CategoryIcon name={`${c.name} ${c.slug}`} className='size-5' />
              </span>
              <span className='min-w-0'>
                <span className='block font-bold group-hover:text-brand-600'>{c.name}</span>
                <span className='block text-xs text-n-600'>{c.productsCount} items</span>
              </span>
            </Link>
            {c.children.length > 0 && (
              <div className='mt-4 flex flex-wrap gap-1.5'>
                {c.children.map((s) => (
                  <Link key={s.id} href={`/category/${s.slug}`} className='rounded-full border border-n-200 px-2.5 py-1 text-xs font-medium hover:border-brand-600 hover:text-brand-600'>{s.name}</Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
