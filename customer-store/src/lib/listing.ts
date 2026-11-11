/** Product-list filters, shared by the server page and the browser listing so cache keys match. */
export interface ListingFilters {
  minPrice?: number
  maxPrice?: number
  sellers: string[]
  brands: string[]
  /** Minimum discount % (10 / 25 / 50) */
  discount?: number
  inStock: boolean
}

export const EMPTY_FILTERS: ListingFilters = { sellers: [], brands: [], inStock: false }
export const DISCOUNT_OPTIONS = [10, 25, 50]
export const SORT_KEYS = ['latest', 'deals', 'trending'] as const

type ParamSource = { get(name: string): string | null }

const num = (v: string | null) => {
  const n = v == null || v === '' ? NaN : Number(v)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}
const list = (v: string | null) => (v ? v.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 30) : [])

/** Reads filters from URL params (URLSearchParams, or a wrapper around Next's searchParams object) */
export function parseFilters(p: ParamSource): ListingFilters {
  const discount = num(p.get('discount'))
  return {
    minPrice: num(p.get('minPrice')),
    maxPrice: num(p.get('maxPrice')),
    sellers: list(p.get('seller')),
    brands: list(p.get('brand')),
    discount: discount && DISCOUNT_OPTIONS.includes(discount) ? discount : undefined,
    inStock: p.get('inStock') === '1',
  }
}

/** Stable query string for the filters (sorted lists) — also the cache key part */
export function filtersQuery(f: ListingFilters) {
  const q = new URLSearchParams()
  if (f.minPrice != null) q.set('minPrice', String(f.minPrice))
  if (f.maxPrice != null) q.set('maxPrice', String(f.maxPrice))
  if (f.sellers.length) q.set('seller', [...f.sellers].sort().join(','))
  if (f.brands.length) q.set('brand', [...f.brands].sort().join(','))
  if (f.discount) q.set('discount', String(f.discount))
  if (f.inStock) q.set('inStock', '1')
  return q
}

export const activeFilterCount = (f: ListingFilters) =>
  (f.minPrice != null || f.maxPrice != null ? 1 : 0) + f.sellers.length + f.brands.length + (f.discount ? 1 : 0) + (f.inStock ? 1 : 0)

/** Next's page searchParams object → something with get() */
export const paramsFromRecord = (sp: Record<string, string | string[] | undefined>): ParamSource => ({
  get: (k) => { const v = sp[k]; return typeof v === 'string' ? v : Array.isArray(v) ? v.join(',') : null },
})

export const listingKey = (listSlug: string, sort: string, f: ListingFilters) => `${listSlug}|${sort}|${filtersQuery(f)}`
