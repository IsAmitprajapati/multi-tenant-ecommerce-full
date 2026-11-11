'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { History, SearchX, TrendingUp, X } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { addRecentSearch, clearRecentSearches, removeRecentSearch, useRecentSearches } from '@/lib/recent-searches'
import ProductCard from '@/components/home/ProductCard'
import { setSearchQuery } from '@/components/layout/SearchBox'
import { MIN_SEARCH_LENGTH, SEARCH_CACHE_SIZE, searchKey } from '@/lib/search'
import type { ProductCard as Card, ProductListing } from '@/lib/types'

type Result = { total: number; products: Card[] }

function ResultSkeleton() {
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5' aria-busy='true' aria-label='Searching'>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className='overflow-hidden rounded-xl border border-n-200 bg-white'>
          <div className='aspect-[19/13] animate-pulse bg-n-100' />
          <div className='space-y-2 p-3'><div className='h-2.5 w-1/2 animate-pulse rounded bg-n-100' /><div className='h-3 w-4/5 animate-pulse rounded bg-n-100' /></div>
        </div>
      ))}
    </div>
  )
}

/** Search page (Search design): recent + trending before typing, live results while typing */
export default function SearchView({ trending }: { trending: { title: string }[] }) {
  const params = useSearchParams()
  const query = params.get('q') ?? ''
  const q = query.trim()
  const recents = useRecentSearches()

  // `q` is already debounced: the header box writes ?q= only after a pause in typing
  const key = searchKey(q)
  const tooShort = key.length > 0 && key.length < MIN_SEARCH_LENGTH

  // Results per normalised term (state renders them; the ref lets effects/handlers check without re-running)
  const [results, setResults] = useState<Record<string, Result>>({})
  const resultsRef = useRef(results)
  const [failed, setFailed] = useState<string | null>(null)
  const prefetching = useRef(new Set<string>())

  const store = useCallback((k: string, d: ProductListing) => {
    const next = { ...resultsRef.current, [k]: { total: d.total ?? d.products.length, products: d.products } }
    // Keep the cache bounded: drop the oldest terms
    const keys = Object.keys(next)
    for (const old of keys.slice(0, Math.max(0, keys.length - SEARCH_CACHE_SIZE))) delete next[old]
    resultsRef.current = next
    setResults(next)
  }, [])

  const request = (term: string, signal?: AbortSignal) =>
    fetch(`${API_URL}/public/products?q=${encodeURIComponent(term)}`, { signal })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ProductListing> })

  // Live search: one request per settled term; a newer term cancels the request still in flight
  useEffect(() => {
    if (key.length < MIN_SEARCH_LENGTH || resultsRef.current[key]) return
    const ctrl = new AbortController()
    request(key, ctrl.signal)
      .then((d) => { store(key, d); setFailed(null) })
      .catch((e: unknown) => { if ((e as Error).name !== 'AbortError') setFailed(key) })
    return () => ctrl.abort()
  }, [key, store])

  /** Hover prefetch for trending/recent picks (not cancelled — the user is about to click) */
  const prefetch = (term: string) => {
    const k = searchKey(term)
    if (k.length < MIN_SEARCH_LENGTH || resultsRef.current[k] || prefetching.current.has(k)) return
    prefetching.current.add(k)
    request(k).then((d) => store(k, d)).catch(() => {}).finally(() => prefetching.current.delete(k))
  }

  const pick = (term: string) => { addRecentSearch(term); setSearchQuery(term); window.scrollTo({ top: 0 }) }
  const current = key ? results[key] : undefined

  return (
    // Narrow centred column for recent/trending/no-results (design); full home width when products are listed
    <div className={`mx-auto w-full pt-8 pb-14 sm:pt-10 ${q && !tooShort && (!current || current.total > 0) ? 'max-w-[1440px] px-4 sm:px-8 lg:px-10' : 'max-w-[760px] px-4 sm:px-0'}`}>
      {!q ? (
        <>
          {recents.length > 0 && (
            <section aria-label='Recent searches' className='mb-7'>
              <div className='mb-3 flex items-center justify-between'>
                <h2 className='text-sm font-bold'>Recent searches</h2>
                <button type='button' onClick={clearRecentSearches} className='link cursor-pointer text-xs'>Clear</button>
              </div>
              <div className='flex flex-wrap gap-2.5'>
                {recents.map((r) => (
                  <span key={r} className='group inline-flex items-center rounded-full border-[1.5px] border-n-200 bg-white text-[13px] font-semibold hover:border-brand-600'>
                    <button type='button' onClick={() => pick(r)} onMouseEnter={() => prefetch(r)} className='inline-flex cursor-pointer items-center gap-1.5 py-2 pl-3.5'>
                      <History className='size-3.5 text-n-400' /> {r}
                    </button>
                    <button type='button' onClick={() => removeRecentSearch(r)} aria-label={`Remove ${r} from recent searches`}
                      className='ml-1 flex size-6 cursor-pointer items-center justify-center rounded-full text-n-400 hover:bg-n-100 hover:text-n-900 mr-1.5'>
                      <X className='size-3' />
                    </button>
                  </span>
                ))}
              </div>
            </section>
          )}

          {trending.length > 0 && (
            <section aria-label='Trending now'>
              <h2 className='mb-1 text-sm font-bold'>Trending now</h2>
              <ol>
                {trending.map((t, i) => (
                  <li key={t.title}>
                    <button type='button' onClick={() => pick(t.title)} onMouseEnter={() => prefetch(t.title)}
                      className='flex w-full cursor-pointer items-center gap-3.5 border-b border-n-200 py-3 text-left hover:text-brand-700'>
                      <span className='w-4 text-[13px] font-bold text-n-400 tabular-nums'>{i + 1}</span>
                      <TrendingUp className='size-4 text-brand-600' />
                      <span className='text-sm'>{t.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {recents.length === 0 && trending.length === 0 && (
            <p className='text-center text-sm text-n-600'>Search for products, brands or stores.</p>
          )}
        </>
      ) : tooShort ? (
        <p className='mt-10 text-center text-[13px] text-n-600'>Keep typing — enter at least {MIN_SEARCH_LENGTH} characters to search.</p>
      ) : failed === key && !current ? (
        <p className='card text-center text-sm text-[#B23139]'>Couldn’t search right now. Check your connection and try again.</p>
      ) : !current ? (
        <>
          <div className='mb-4 h-4 w-44 animate-pulse rounded bg-n-200' />
          <ResultSkeleton />
        </>
      ) : current.total === 0 ? (
        <div className='mt-12 text-center'>
          <SearchX className='mx-auto size-11 text-n-400' />
          <p className='mt-4 text-[15px] font-semibold'>No results for “{q}”</p>
          <p className='mt-1 text-[13px] text-n-600'>Check the spelling or try a more general search term.</p>
        </div>
      ) : (
        <section aria-label='Search results'>
          <p className='mb-4 text-[13px] text-n-600' aria-live='polite'>
            {current.total} {current.total === 1 ? 'result' : 'results'} for “{q}”
            {current.total > current.products.length && <> · showing the first {current.products.length}</>}
          </p>
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5'>
            {current.products.map((p) => (
              <div key={p.id} onClickCapture={() => addRecentSearch(q)}>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
          <p className='mt-6 text-center text-xs text-n-600'>
            Looking for a whole category? <Link href='/categories' className='link'>Browse all categories</Link>
          </p>
        </section>
      )}
    </div>
  )
}
