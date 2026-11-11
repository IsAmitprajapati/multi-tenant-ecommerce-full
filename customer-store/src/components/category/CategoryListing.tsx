'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { SearchX, SlidersHorizontal, X } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { inr } from '@/lib/format'
import { activeFilterCount, EMPTY_FILTERS, filtersQuery, listingKey, parseFilters, SORT_KEYS, type ListingFilters } from '@/lib/listing'
import { ProductGrid } from '@/components/home/ProductRail'
import ListingSkeleton from '@/components/home/ListingSkeleton'
import { ContentFooter } from '@/components/layout/SiteFooter'
import FilterPanel from './FilterPanel'
import { ALL, SubcategoryChips, SubcategorySidebar } from './SubcategoryNav'
import type { ListingFacets, ProductListing, PublicCategory } from '@/lib/types'

const SORTS: { key: (typeof SORT_KEYS)[number]; label: string }[] = [
  { key: 'latest', label: 'Newest' },
  { key: 'deals', label: 'Best deals' },
  { key: 'trending', label: 'Trending' },
]

/** What the current URL selects inside this category */
function selectionFrom(top: PublicCategory, pathname: string, params: URLSearchParams) {
  const slug = decodeURIComponent(pathname.split('/')[2] ?? top.slug)
  const isTop = slug === top.slug
  const showAll = isTop && (params.get('view') === 'all' || top.children.length === 0)
  const current = isTop ? (showAll ? null : top.children[0] ?? null) : top.children.find((s) => s.slug === slug) ?? null
  const sortParam = params.get('sort')
  const sort = SORT_KEYS.find((k) => k === sortParam) ?? 'latest'
  const filters = parseFilters(params)
  const listSlug = current?.slug ?? top.slug
  return { current, sort, filters, listSlug, activeSlug: current?.slug ?? ALL, key: listingKey(listSlug, sort, filters) }
}

function buildHref(top: PublicCategory, slug: string, sort: string, filters: ListingFilters) {
  const qs = filtersQuery(filters)
  if (slug === ALL) qs.set('view', 'all')
  if (sort !== 'latest') qs.set('sort', sort)
  const q = qs.toString()
  return `/category/${slug === ALL ? top.slug : slug}${q ? `?${q}` : ''}`
}

/**
 * Product listing (PLP design): sub-categories + filters on the left, products on the right.
 * Sub-category, sort and filter changes happen in the browser — the URL updates (shareable,
 * back/forward work), only the grid changes, and results are cached and prefetched.
 */
export default function CategoryListing({ top, initialKey, initialListing }: {
  top: PublicCategory
  initialKey: string
  initialListing: ProductListing
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  const sel = selectionFrom(top, pathname, new URLSearchParams(params.toString()))

  // Results per listing key: state for rendering, a ref mirror for callbacks
  const [cache, setCache] = useState(() => new Map<string, ProductListing>([[initialKey, initialListing]]))
  const cacheRef = useRef(cache)
  const inflight = useRef(new Map<string, Promise<ProductListing>>())
  const [error, setError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const load = useCallback((listSlug: string, sort: string, filters: ListingFilters) => {
    const key = listingKey(listSlug, sort, filters)
    const hit = cacheRef.current.get(key)
    if (hit) return Promise.resolve(hit)
    let p = inflight.current.get(key)
    if (!p) {
      const qs = filtersQuery(filters)
      qs.set('category', listSlug)
      qs.set('sort', sort)
      p = fetch(`${API_URL}/public/products?${qs}`)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<ProductListing> })
        .then((d) => {
          cacheRef.current = new Map(cacheRef.current).set(key, d)
          setCache(cacheRef.current)
          return d
        })
        .finally(() => inflight.current.delete(key))
      inflight.current.set(key, p)
    }
    return p
  }, [])

  const listing = cache.get(sel.key)
  const products = listing?.products
  // Filter options belong to the sub-category, so any cached result for it will do while loading
  let facets: ListingFacets | null = listing?.facets ?? null
  if (!facets) for (const [k, v] of cache) if (k.startsWith(`${sel.listSlug}|`) && v.facets) { facets = v.facets; break }

  useEffect(() => {
    if (cacheRef.current.has(sel.key)) return
    let cancelled = false
    load(sel.listSlug, sel.sort, sel.filters)
      .then(() => { if (!cancelled) setError(null) })
      .catch(() => { if (!cancelled) setError('Couldn’t load products. Check your connection and try again.') })
    return () => { cancelled = true }
  }, [sel.key, sel.listSlug, sel.sort, sel.filters, load])

  // Warm the cache for every sub-category (one at a time, when the browser is idle) so switching is instant
  const filtersKey = filtersQuery(sel.filters).toString()
  useEffect(() => {
    let stopped = false
    const filters = parseFilters(new URLSearchParams(filtersKey))
    const run = async () => {
      for (const slug of [top.slug, ...top.children.map((c) => c.slug)]) {
        if (stopped) return
        await load(slug, sel.sort, filters).catch(() => {})
      }
    }
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300))
    const handle = idle(() => { run() })
    return () => {
      stopped = true
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle as number)
      else window.clearTimeout(handle as number)
    }
  }, [top, sel.sort, filtersKey, load])

  const push = (href: string) => {
    setError(null)
    window.history.pushState(null, '', href)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  /** Same-page navigation without a server round-trip (ctrl/cmd-click still opens a new tab) */
  const go = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
    e.preventDefault()
    push(href)
  }
  const applyFilters = (next: ListingFilters) => push(buildHref(top, sel.activeSlug, sel.sort, next))
  const prefetch = (slug: string) => { load(slug === ALL ? top.slug : slug, sel.sort, sel.filters).catch(() => {}) }

  const nav = { top, activeSlug: sel.activeSlug, hrefFor: (slug: string) => buildHref(top, slug, sel.sort, sel.filters), onNavigate: go, onPrefetch: prefetch }
  const title = sel.current ? sel.current.name : `All ${top.name}`
  const allHref = buildHref(top, ALL, sel.sort, sel.filters)
  const nFilters = activeFilterCount(sel.filters)
  const total = listing?.total ?? products?.length ?? 0

  // Removable chips for what's applied
  const chips: { label: string; next: ListingFilters }[] = []
  const f = sel.filters
  if (f.minPrice != null || f.maxPrice != null) {
    chips.push({ label: f.minPrice != null && f.maxPrice != null ? `${inr(f.minPrice)} – ${inr(f.maxPrice)}` : f.minPrice != null ? `${inr(f.minPrice)}+` : `Up to ${inr(f.maxPrice!)}`, next: { ...f, minPrice: undefined, maxPrice: undefined } })
  }
  for (const s of f.sellers) chips.push({ label: facets?.sellers.find((x) => x.slug === s)?.name ?? s, next: { ...f, sellers: f.sellers.filter((x) => x !== s) } })
  for (const b of f.brands) chips.push({ label: b, next: { ...f, brands: f.brands.filter((x) => x !== b) } })
  if (f.discount) chips.push({ label: `${f.discount}% or more off`, next: { ...f, discount: undefined } })
  if (f.rating) chips.push({ label: `${f.rating}★ & up`, next: { ...f, rating: undefined } })
  if (f.inStock) chips.push({ label: 'In stock', next: { ...f, inStock: false } })

  const filterHeader = (
    <div className='mb-4 flex items-center justify-between'>
      <span className='text-sm font-bold'>Filters</span>
      {nFilters > 0 && <button type='button' onClick={() => applyFilters(EMPTY_FILTERS)} className='link cursor-pointer text-xs'>Clear all</button>}
    </div>
  )

  return (
    // data-sidebar-layout: the global trust strip hides; ours sits in the content column so the sidebar reaches the footer
    <div data-sidebar-layout className='mx-auto flex min-h-[calc(100dvh-72px)] max-w-[1440px]'>
      <SubcategorySidebar {...nav}>
        {filterHeader}
        <FilterPanel facets={facets} filters={sel.filters} onChange={applyFilters} />
      </SubcategorySidebar>

      <div className='flex min-w-0 flex-1 flex-col px-4 pt-6 sm:px-8 lg:px-10'>
        <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
          <Link href='/' className='hover:text-brand-600'>Home</Link>
          {' / '}<Link href='/categories' className='hover:text-brand-600'>Categories</Link>
          {' / '}<a href={allHref} onClick={(e) => go(e, allHref)} className='hover:text-brand-600'>{top.name}</a>
          {sel.current && <> / <span className='font-semibold text-n-900'>{sel.current.name}</span></>}
        </nav>

        <div className='mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
          <h1 className='text-[22px] font-bold'>
            {title} {products && <span className='font-normal text-n-600'>· {total} {total === 1 ? 'product' : 'products'}</span>}
          </h1>
          <div className='flex items-center gap-2'>
            <button type='button' onClick={() => setSheetOpen(true)}
              className='flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] border-n-200 bg-white px-3.5 py-1.5 text-xs font-semibold lg:hidden'>
              <SlidersHorizontal className='size-3.5' /> Filters{nFilters > 0 && <span className='rounded-full bg-brand-600 px-1.5 text-[10px] text-white'>{nFilters}</span>}
            </button>
            <nav className='no-scrollbar flex gap-1.5 overflow-x-auto' aria-label='Sort products'>
              {SORTS.map((s) => {
                const href = buildHref(top, sel.activeSlug, s.key, sel.filters)
                const on = s.key === sel.sort
                return (
                  <a key={s.key} href={href} onClick={(e) => go(e, href)} onMouseEnter={() => load(sel.listSlug, s.key, sel.filters).catch(() => {})} aria-current={on ? 'true' : undefined}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-n-200 bg-white hover:border-brand-600'}`}>
                    {s.label}
                  </a>
                )
              })}
            </nav>
          </div>
        </div>

        {top.children.length > 0 && <div className='mt-4'><SubcategoryChips {...nav} /></div>}

        {chips.length > 0 && (
          <div className='mt-4 flex flex-wrap items-center gap-2'>
            {chips.map((c) => (
              <button key={c.label} type='button' onClick={() => applyFilters(c.next)} aria-label={`Remove filter ${c.label}`}
                className='inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-[#c6e5cd]'>
                {c.label} <X className='size-3.5' />
              </button>
            ))}
            <button type='button' onClick={() => applyFilters(EMPTY_FILTERS)} className='link cursor-pointer px-1 text-xs'>Clear all</button>
          </div>
        )}

        <div className='mt-5' aria-live='polite' aria-busy={!products && !error}>
          {error
            ? <p className='card text-center text-sm text-[#B23139]'>{error}</p>
            : !products
              ? <ListingSkeleton />
              : products.length
                ? <ProductGrid products={products} />
                : nFilters > 0
                  ? (
                    <div className='mt-10 text-center'>
                      <SearchX className='mx-auto size-10 text-n-400' />
                      <p className='mt-4 text-[15px] font-semibold'>No products match these filters</p>
                      <p className='mt-1 text-[13px] text-n-600'>Try removing a filter or clearing all to see more results.</p>
                      <button type='button' onClick={() => applyFilters(EMPTY_FILTERS)} className='btn-primary mt-4 px-5 py-2.5 text-[13px]'>Clear all filters</button>
                    </div>
                  )
                  : <p className='card text-center text-sm text-n-600'>No products in {title} yet — check back soon.</p>}
        </div>

        {/* Footer lives in the product column so the sidebar runs the full page height */}
        <ContentFooter />
      </div>

      <FilterSheet open={sheetOpen} onClose={() => setSheetOpen(false)} resultCount={products ? total : null}>
        {filterHeader}
        <FilterPanel facets={facets} filters={sel.filters} onChange={applyFilters} />
      </FilterSheet>
    </div>
  )
}

/** Phones/tablets: filters in a bottom sheet */
function FilterSheet({ open, onClose, resultCount, children }: { open: boolean; onClose: () => void; resultCount: number | null; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose() }} aria-label='Filters'
      className='mt-auto mb-0 max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-n-900 backdrop:bg-n-900/50 lg:hidden'>
      <div className='flex max-h-[85dvh] flex-col'>
        <div className='flex justify-end px-4 pt-3'>
          <button type='button' onClick={onClose} aria-label='Close filters' className='flex size-8 cursor-pointer items-center justify-center rounded-lg text-n-600 hover:bg-n-50'><X className='size-5' /></button>
        </div>
        <div className='flex-1 overflow-y-auto px-5 pb-4'>{children}</div>
        <div className='border-t border-n-200 p-4'>
          <button type='button' onClick={onClose} className='btn-primary w-full'>
            {resultCount == null ? 'Show products' : `Show ${resultCount} ${resultCount === 1 ? 'product' : 'products'}`}
          </button>
        </div>
      </div>
    </dialog>
  )
}
