import Link from 'next/link'
import CategoryThumb from './CategoryThumb'
import type { PublicCategory } from '@/lib/types'

/**
 * Desktop left rail of categories (Category-Browse design). Links pick a category on /categories.
 * The coloured column fills the page height (down to the footer); the list inside stays in view.
 */
export default function CategorySidebar({ categories, activeSlug }: { categories: PublicCategory[]; activeSlug?: string }) {
  return (
    <div className='hidden w-[248px] shrink-0 bg-n-100 lg:block'>
      <aside className='sticky top-[72px] h-[calc(100dvh-72px)] overflow-y-auto px-2.5 py-5'>
        <div className='px-2.5 pb-2.5 text-[11px] font-bold tracking-wider text-n-600 uppercase'>Categories</div>
        <nav className='flex flex-col gap-0.5' aria-label='Categories'>
          {categories.map((c, i) => {
            const active = c.slug === activeSlug
            return (
              <Link key={c.id} href={`/categories?c=${c.slug}`} scroll={false} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-[10px] border-l-[3px] px-2.5 py-2 text-[13px] font-semibold transition-colors ${active ? 'border-brand-600 bg-brand-100' : 'border-transparent hover:bg-white/70'}`}>
                <CategoryThumb name={c.name} slug={c.slug} iconUrl={c.iconUrl} size='size-8' rounded='rounded-[9px]' tint={i % 2 ? 'bg-n-50' : 'bg-brand-100'} iconClass='size-4' />
                <span className='min-w-0 flex-1 truncate'>{c.name}</span>
                <span className='text-[11px] text-n-600'>{c.productsCount}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </div>
  )
}

/** Same shape as the sidebar, shown while a category page loads */
export function CategorySidebarSkeleton({ width = 'w-[248px]' }: { width?: string }) {
  return (
    <div className={`hidden shrink-0 bg-n-100 lg:block ${width}`} aria-hidden>
      <div className='sticky top-[72px] h-[calc(100dvh-72px)] px-2.5 py-5'>
        <div className='mx-2.5 mb-3.5 h-2.5 w-20 animate-pulse rounded bg-n-200' />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className='flex items-center gap-2.5 px-2.5 py-2'>
            <span className='size-8 shrink-0 animate-pulse rounded-[9px] bg-n-200' />
            <span className='h-3 flex-1 animate-pulse rounded bg-n-200' style={{ maxWidth: `${60 + ((i * 17) % 35)}%` }} />
            <span className='h-2.5 w-4 animate-pulse rounded bg-n-200' />
          </div>
        ))}
      </div>
    </div>
  )
}
