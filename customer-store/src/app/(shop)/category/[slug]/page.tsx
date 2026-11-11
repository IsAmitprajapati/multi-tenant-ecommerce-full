import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { CategorySidebarSkeleton } from '@/components/home/CategorySidebar'
import CategoryListing from '@/components/category/CategoryListing'
import { listingKey, paramsFromRecord, parseFilters } from '@/lib/listing'
import ListingSkeleton from '@/components/home/ListingSkeleton'
import { getCategories, getProducts } from '@/lib/public-api'

/**
 * Product listing (PLP design).
 *  /category/<top>            → first sub-category selected
 *  /category/<top>?view=all   → every product in the category
 *  /category/<sub>            → that sub-category
 * The left side lists all sub-categories of the category.
 */
async function Listing({ params, searchParams }: PageProps<'/category/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const sort = typeof sp.sort === 'string' && ['latest', 'deals', 'trending'].includes(sp.sort) ? sp.sort : 'latest'
  const categories = await getCategories()
  const top = categories.find((c) => c.slug === slug || c.children.some((s) => s.slug === slug))
  if (!top) notFound()

  // First view is rendered on the server; later switches happen in the browser (CategoryListing)
  const isTop = top.slug === slug
  const showAll = isTop && (sp.view === 'all' || top.children.length === 0)
  const listSlug = isTop ? (showAll ? top.slug : top.children[0]!.slug) : slug
  const filters = parseFilters(paramsFromRecord(sp))
  const data = await getProducts({ category: listSlug, sort, filters })
  if (!data?.category) notFound()

  return <CategoryListing top={top} initialKey={listingKey(listSlug, sort, filters)} initialListing={data} />
}

function CategoryPageSkeleton() {
  return (
    <div data-sidebar-layout className='mx-auto flex min-h-[calc(100dvh-72px)] max-w-[1440px]' aria-busy='true' aria-label='Loading products'>
      <CategorySidebarSkeleton width='w-[264px]' />
      <div className='min-w-0 flex-1 px-4 pt-6 pb-12 sm:px-8 lg:px-10'>
        <div className='h-3 w-48 animate-pulse rounded bg-n-200' />
        <div className='mt-3 flex items-center justify-between'>
          <div className='h-7 w-56 animate-pulse rounded bg-n-200' />
          <div className='hidden gap-1.5 sm:flex'>{Array.from({ length: 3 }).map((_, i) => <div key={i} className='h-7 w-20 animate-pulse rounded-full bg-n-200' />)}</div>
        </div>
        <div className='mt-5'><ListingSkeleton /></div>
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
