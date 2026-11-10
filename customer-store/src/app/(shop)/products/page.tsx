import { Suspense } from 'react'
import type { Metadata } from 'next'
import { ProductGrid } from '@/components/home/ProductRail'
import SortTabs from '@/components/home/SortTabs'
import ListingSkeleton from '@/components/home/ListingSkeleton'
import { getProducts } from '@/lib/public-api'

export const metadata: Metadata = { title: 'Products' }

const TITLES: Record<string, string> = { deals: 'Best deals', trending: 'Trending now', latest: 'New arrivals' }

async function Listing({ searchParams }: PageProps<'/products'>) {
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q.trim().slice(0, 100) : ''
  const sort = typeof sp.sort === 'string' && TITLES[sp.sort] ? sp.sort : 'latest'
  const data = await getProducts({ sort, q: q || undefined })
  const products = data?.products ?? []
  return (
    <>
      <h1 className='text-2xl font-bold'>{q ? `Results for “${q}”` : TITLES[sort]}</h1>
      <div className='mt-4 mb-4 flex items-center justify-between gap-3'>
        <span className='text-sm text-n-600'>{products.length} products</span>
        <SortTabs basePath='/products' active={sort} extra={q ? { q } : {}} />
      </div>
      {products.length
        ? <ProductGrid products={products} />
        : <p className='card text-center text-sm text-n-600'>{q ? 'Nothing matches your search. Try another word.' : 'No products yet — check back soon.'}</p>}
    </>
  )
}

export default function ProductsPage(props: PageProps<'/products'>) {
  return (
    <div className='mx-auto max-w-[1440px] px-4 pt-6 pb-12 sm:px-8 lg:px-10'>
      <Suspense fallback={<ListingSkeleton />}>
        <Listing {...props} />
      </Suspense>
    </div>
  )
}
