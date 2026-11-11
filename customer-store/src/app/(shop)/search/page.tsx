import { Suspense } from 'react'
import type { Metadata } from 'next'
import SearchView from '@/components/search/SearchView'
import { getProducts } from '@/lib/public-api'

export const metadata: Metadata = { title: 'Search' }

/** "Trending now": what's being ordered most (newest until orders exist) */
async function TrendingSearch() {
  const data = await getProducts({ sort: 'trending' })
  const trending = (data?.products ?? []).slice(0, 6).map((p) => ({ title: p.title }))
  return (
    <Suspense>
      <SearchView trending={trending} />
    </Suspense>
  )
}

export default function SearchPage() {
  return <TrendingSearch />
}
