import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ProductGrid } from '@/components/home/ProductRail'
import CategorySidebar, { CategorySidebarSkeleton } from '@/components/home/CategorySidebar'
import SortTabs from '@/components/home/SortTabs'
import ListingSkeleton from '@/components/home/ListingSkeleton'
import { getCategories, getProducts } from '@/lib/public-api'

async function Listing({ params, searchParams }: PageProps<'/category/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const sort = typeof sp.sort === 'string' ? sp.sort : 'latest'
  const [data, categories] = await Promise.all([getProducts({ category: slug, sort }), getCategories()])
  if (!data?.category) notFound()

  const top = categories.find((c) => c.slug === slug || c.children.some((s) => s.slug === slug))
  return (
    <div className='mx-auto flex max-w-[1440px]'>
      <CategorySidebar categories={categories} activeSlug={top?.slug} />
      <div className='min-w-0 flex-1 px-4 pt-6 pb-12 sm:px-8 lg:px-10'>
        <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
          <Link href='/' className='hover:text-brand-600'>Home</Link>
          {top && top.slug !== slug && <> / <Link href={`/category/${top.slug}`} className='hover:text-brand-600'>{top.name}</Link></>}
          {' '}/ <span className='text-n-900'>{data.category.name}</span>
        </nav>
        <h1 className='mt-2 text-2xl font-bold'>{data.category.name}</h1>
        {data.category.description && <p className='mt-1 text-sm text-n-600'>{data.category.description}</p>}

        {top && top.children.length > 0 && (
          <div className='no-scrollbar mt-4 flex gap-1.5 overflow-x-auto'>
            <Link href={`/category/${top.slug}`} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${top.slug === slug ? 'border-brand-600 bg-brand-100 text-brand-700' : 'border-n-200 bg-white'}`}>All</Link>
            {top.children.map((s) => (
              <Link key={s.id} href={`/category/${s.slug}`} className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${s.slug === slug ? 'border-brand-600 bg-brand-100 text-brand-700' : 'border-n-200 bg-white hover:border-brand-600'}`}>{s.name}</Link>
            ))}
          </div>
        )}

        <div className='mt-5 mb-4 flex items-center justify-between gap-3'>
          <span className='text-sm text-n-600'>{data.products.length} products</span>
          <SortTabs basePath={`/category/${slug}`} active={sort} />
        </div>
        {data.products.length
          ? <ProductGrid products={data.products} />
          : <p className='card text-center text-sm text-n-600'>No products here yet — check back soon.</p>}
      </div>
    </div>
  )
}

function CategoryPageSkeleton() {
  return (
    <div className='mx-auto flex max-w-[1440px]' aria-busy='true' aria-label='Loading category'>
      <CategorySidebarSkeleton />
      <div className='min-w-0 flex-1 px-4 pt-6 pb-12 sm:px-8 lg:px-10'>
        <div className='h-3 w-40 animate-pulse rounded bg-n-200' />
        <div className='mt-3 h-7 w-56 animate-pulse rounded bg-n-200' />
        <div className='mt-4 flex gap-1.5'>
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className='h-7 w-20 animate-pulse rounded-full bg-n-200' />)}
        </div>
        <div className='mt-5 mb-4 flex items-center justify-between'>
          <div className='h-3 w-20 animate-pulse rounded bg-n-200' />
          <div className='flex gap-1.5'>{Array.from({ length: 3 }).map((_, i) => <div key={i} className='h-7 w-20 animate-pulse rounded-full bg-n-200' />)}</div>
        </div>
        <ListingSkeleton />
      </div>
    </div>
  )
}

export default function CategoryPage(props: PageProps<'/category/[slug]'>) {
  return (
    <Suspense fallback={<CategoryPageSkeleton />}>
      <Listing {...props} />
    </Suspense>
  )
}
