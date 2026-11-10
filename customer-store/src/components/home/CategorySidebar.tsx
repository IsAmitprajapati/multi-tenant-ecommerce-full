import Link from 'next/link'
import CategoryIcon from './CategoryIcon'
import type { PublicCategory } from '@/lib/types'

/** Desktop left rail of categories (as in the design) */
export default function CategorySidebar({ categories, activeSlug }: { categories: PublicCategory[]; activeSlug?: string }) {
  return (
    <aside className='sticky top-[72px] hidden h-[calc(100dvh-72px)] w-[248px] shrink-0 overflow-y-auto bg-n-100 px-2.5 py-5 lg:block'>
      <div className='px-2.5 pb-2.5 text-[11px] font-bold tracking-wider text-n-600 uppercase'>Categories</div>
      <nav className='flex flex-col gap-0.5' aria-label='Categories'>
        {categories.map((c, i) => {
          const active = c.slug === activeSlug
          return (
            <Link key={c.id} href={`/category/${c.slug}`} aria-current={active ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-[10px] border-l-[3px] px-2.5 py-2 text-[13px] font-semibold transition-colors ${active ? 'border-brand-600 bg-brand-100' : 'border-transparent hover:bg-white/70'}`}>
              <span className={`flex size-8 shrink-0 items-center justify-center rounded-[9px] text-brand-700 ${i % 2 ? 'bg-n-50' : 'bg-brand-100'}`}>
                <CategoryIcon name={`${c.name} ${c.slug}`} className='size-4' />
              </span>
              <span className='min-w-0 flex-1 truncate'>{c.name}</span>
              <span className='text-[11px] text-n-600'>{c.productsCount}</span>
            </Link>
          )
        })}
      </nav>
      <Link href='/categories' className='mt-2.5 block px-3 py-2.5 text-center text-xs font-semibold text-brand-600 hover:text-brand-500'>View all categories →</Link>
    </aside>
  )
}

/** Same shape as the sidebar, shown while a category page loads */
export function CategorySidebarSkeleton() {
  return (
    <aside className='sticky top-[72px] hidden h-[calc(100dvh-72px)] w-[248px] shrink-0 bg-n-100 px-2.5 py-5 lg:block' aria-hidden>
      <div className='mx-2.5 mb-3.5 h-2.5 w-20 animate-pulse rounded bg-n-200' />
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className='flex items-center gap-2.5 px-2.5 py-2'>
          <span className='size-8 shrink-0 animate-pulse rounded-[9px] bg-n-200' />
          <span className='h-3 flex-1 animate-pulse rounded bg-n-200' style={{ maxWidth: `${60 + ((i * 17) % 35)}%` }} />
          <span className='h-2.5 w-4 animate-pulse rounded bg-n-200' />
        </div>
      ))}
    </aside>
  )
}
