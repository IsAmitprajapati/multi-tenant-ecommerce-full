import { Suspense } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ChevronRight } from 'lucide-react'
import CategorySidebar, { CategorySidebarSkeleton } from '@/components/home/CategorySidebar'
import CategoryIcon from '@/components/home/CategoryIcon'
import CategoryThumb from '@/components/home/CategoryThumb'
import { ContentFooter } from '@/components/layout/SiteFooter'
import { getCategories } from '@/lib/public-api'

export const metadata: Metadata = { title: 'All categories' }

/** Design gradients for sub-category cards without an image */
const CARD_BGS = [
  'linear-gradient(135deg,#F5D98C,#F0C168)', 'linear-gradient(135deg,#E4F0E6,#CFE3D3)', 'linear-gradient(135deg,#D8EEDD,#B9DDC3)',
  'linear-gradient(135deg,#F0E2C8,#E3CD9E)', 'linear-gradient(135deg,#E9E28C,#D8CE5F)', 'linear-gradient(135deg,#CDE8D6,#A9D6B8)',
]

/** "View all" from the home page — Category-Browse design: categories on the left, the chosen one's sub-categories on the right */
async function Browse({ searchParams }: PageProps<'/categories'>) {
  const sp = await searchParams
  const categories = await getCategories()
  if (!categories.length) return <p className='card m-8 text-center text-sm text-n-600'>No categories yet.</p>
  const top = categories.find((c) => c.slug === sp.c) ?? categories[0]!

  return (
    // data-sidebar-layout: the trust strip moves into the content column so the sidebar reaches the footer
    <div data-sidebar-layout className='mx-auto flex min-h-[calc(100dvh-72px)] max-w-[1440px]'>
      <CategorySidebar categories={categories} activeSlug={top.slug} />
      <div className='flex min-w-0 flex-1 flex-col px-4 pt-6 sm:px-8 lg:px-10'>
        <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
          <Link href='/' className='hover:text-brand-600'>Home</Link> / <span className='font-semibold text-n-900'>{top.name}</span>
        </nav>

        {/* Phones: pick a category here (the sidebar is desktop-only) */}
        <nav className='no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden' aria-label='Categories'>
          {categories.map((c, i) => (
            <Link key={c.id} href={`/categories?c=${c.slug}`} scroll={false} aria-current={c.id === top.id ? 'page' : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-full border-[1.5px] py-1 pr-3.5 pl-1 text-xs font-semibold ${c.id === top.id ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white'}`}>
              <CategoryThumb name={c.name} slug={c.slug} iconUrl={c.iconUrl} size='size-7' rounded='rounded-full' tint={i % 2 ? 'bg-n-100' : 'bg-brand-100'} iconClass='size-3.5' />
              {c.name}
            </Link>
          ))}
        </nav>

        <h1 className='mt-3 text-2xl font-bold lg:mt-2'>{top.name}</h1>
        <p className='mt-1 text-[13px] text-n-600'>{top.description || `Choose a sub-category, or shop everything in ${top.name}.`}</p>

        <Link href={`/category/${top.slug}?view=all`}
          className='mt-5 flex items-center justify-between gap-4 rounded-card bg-gradient-to-r from-brand-900 to-brand-700 px-6 py-5 transition-opacity hover:opacity-95'>
          <span>
            <span className='block text-[15px] font-bold text-white'>Shop all {top.name}</span>
            <span className='mt-0.5 block text-xs text-[#C7DCCB]'>{top.productsCount} products across every sub-category</span>
          </span>
          <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-lime-500 text-brand-900'><ArrowRight className='size-4' /></span>
        </Link>

        {top.children.length > 0 ? (
          <div className='mt-7 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3'>
            {top.children.map((s, i) => (
              <Link key={s.id} href={`/category/${s.slug}`} className='group overflow-hidden rounded-card border border-n-200 bg-white transition-shadow hover:shadow-[0_6px_20px_-8px_rgba(12,31,22,.25)]'>
                <span className='relative flex h-24 items-center justify-center' style={s.imageUrl ? undefined : { background: CARD_BGS[i % CARD_BGS.length] }}>
                  {s.imageUrl
                    ? <Image src={s.imageUrl} alt='' fill sizes='(min-width: 1024px) 360px, 50vw' className='object-cover' />
                    : <CategoryIcon name={`${s.name} ${s.slug}`} className='size-8 text-brand-700/70' />}
                </span>
                <span className='flex items-center justify-between gap-2 p-3.5'>
                  <span className='min-w-0'>
                    <span className='block truncate text-[13px] font-bold group-hover:text-brand-700'>{s.name}</span>
                    <span className='mt-0.5 block text-[11px] text-n-600'>{s.productsCount} {s.productsCount === 1 ? 'item' : 'items'}</span>
                  </span>
                  <ChevronRight className='size-4 shrink-0 text-n-400' />
                </span>
              </Link>
            ))}
          </div>
        ) : <p className='card mt-7 text-center text-sm text-n-600'>No sub-categories yet.</p>}

        {/* Footer lives in the content column so the sidebar runs the full page height */}
        <ContentFooter />
      </div>
    </div>
  )
}

function BrowseSkeleton() {
  const bar = 'animate-pulse rounded bg-n-200'
  return (
    <div data-sidebar-layout className='mx-auto flex min-h-[calc(100dvh-72px)] max-w-[1440px]' aria-busy='true' aria-label='Loading categories'>
      <CategorySidebarSkeleton />
      <div className='min-w-0 flex-1 px-4 pt-6 pb-12 sm:px-8 lg:px-10'>
        <div className={`h-3 w-32 ${bar}`} /><div className={`mt-3 h-7 w-56 ${bar}`} /><div className={`mt-2 h-3 w-80 ${bar}`} />
        <div className='mt-5 h-[76px] animate-pulse rounded-card bg-n-200' />
        <div className='mt-7 grid grid-cols-2 gap-4 md:grid-cols-3'>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className='h-[150px] animate-pulse rounded-card bg-n-200' />)}
        </div>
      </div>
    </div>
  )
}

export default function CategoriesPage(props: PageProps<'/categories'>) {
  return (
    <Suspense fallback={<BrowseSkeleton />}>
      <Browse {...props} />
    </Suspense>
  )
}
