'use client'

import { useMemo, useState } from 'react'
import { PackageOpen, Search, X } from 'lucide-react'
import { ProductGrid } from '@/components/home/ProductRail'
import type { SellerStore } from '@/lib/types'

const SORTS = [
  { key: 'latest', label: 'Newest' },
  { key: 'deals', label: 'Best deals' },
  { key: 'rating', label: 'Top rated' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
] as const
type SortKey = (typeof SORTS)[number]['key']

/** Store products: category chips, search within the store, sort — all instant (filtered in the browser) */
export default function SellerProducts({ store }: { store: SellerStore }) {
  const [category, setCategory] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('latest')

  const products = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = store.products.filter((p) =>
      (!category || p.categorySlug === category) &&
      (!q || p.title.toLowerCase().includes(q) || (p.brand ?? '').toLowerCase().includes(q)))
    const sorted = [...list]
    if (sort === 'deals') sorted.sort((a, b) => b.discountPercent - a.discountPercent)
    if (sort === 'rating') sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.ratingCount - a.ratingCount)
    if (sort === 'price-asc') sorted.sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') sorted.sort((a, b) => b.price - a.price)
    return sorted
  }, [store.products, category, query, sort])

  if (store.products.length === 0) {
    return (
      <div className='card mt-6 text-center'>
        <PackageOpen className='mx-auto size-10 text-n-400' />
        <p className='mt-3 text-[15px] font-semibold'>{store.seller.name} hasn’t listed any products yet</p>
        <p className='mt-1 text-[13px] text-n-600'>Check back soon — new items show up here as soon as they go live.</p>
      </div>
    )
  }

  const chip = (on: boolean) => `shrink-0 cursor-pointer rounded-full border-[1.5px] px-3.5 py-1.5 text-xs font-semibold ${on ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white hover:border-brand-600'}`

  return (
    <section className='mt-7' aria-label={`Products from ${store.seller.name}`}>
      <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
        <h2 className='text-lg font-bold'>
          {category ? store.categories.find((c) => c.slug === category)?.name : 'All products'}
          <span className='font-normal text-n-600'> · {products.length} {products.length === 1 ? 'product' : 'products'}</span>
        </h2>
        <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
          <label className='relative sm:w-64'>
            <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-n-400' />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type='search' placeholder={`Search in ${store.seller.name}`} aria-label={`Search products in ${store.seller.name}`}
              className='w-full rounded-lg border-[1.5px] border-n-200 bg-white py-2 pr-8 pl-9 text-[13px] outline-none placeholder:text-n-400 focus:border-brand-600 [&::-webkit-search-cancel-button]:hidden' />
            {query && (
              <button type='button' onClick={() => setQuery('')} aria-label='Clear store search' className='absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-n-600 hover:bg-n-100'>
                <X className='size-3.5' />
              </button>
            )}
          </label>
          <label className='flex items-center gap-2 text-xs text-n-600'>
            Sort by
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              className='cursor-pointer rounded-lg border-[1.5px] border-n-200 bg-white px-2.5 py-2 text-xs font-semibold text-n-900 outline-none focus:border-brand-600'>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      </div>

      {store.categories.length > 1 && (
        <nav className='no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0' aria-label='Store categories'>
          <button type='button' aria-pressed={!category} onClick={() => setCategory(null)} className={chip(!category)}>All ({store.products.length})</button>
          {store.categories.map((c) => (
            <button key={c.slug} type='button' aria-pressed={category === c.slug} onClick={() => setCategory(category === c.slug ? null : c.slug)} className={chip(category === c.slug)}>
              {c.name} ({c.count})
            </button>
          ))}
        </nav>
      )}

      <div className='mt-5'>
        {products.length
          ? <ProductGrid products={products} />
          : (
            <div className='mt-8 text-center'>
              <p className='text-[15px] font-semibold'>No products match{query ? ` “${query.trim()}”` : ''}</p>
              <button type='button' onClick={() => { setQuery(''); setCategory(null) }} className='link mt-2 cursor-pointer text-[13px]'>Show all products</button>
            </div>
          )}
      </div>
    </section>
  )
}
