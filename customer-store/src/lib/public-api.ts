import { cacheLife, cacheTag } from 'next/cache'
import { API_URL } from './config'
import type { HomeData, ProductDetail, ProductListing, PublicCategory } from './types'
import { filtersQuery, type ListingFilters } from './listing'

/**
 * Public storefront data (no login). Cached on the server and refreshed every minute,
 * so changes made in Platform admin › Storefront show up within about a minute.
 */
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) throw new Error(`${API_URL}${path} failed with ${res.status}`)
  return res.json() as Promise<T>
}

export async function getHome(): Promise<HomeData> {
  'use cache'
  cacheLife('minutes')
  cacheTag('home')
  try {
    return await getJson<HomeData>('/public/home')
  } catch (err) {
    // API down: render an empty home page instead of crashing
    console.error('[storefront] home data unavailable:', err)
    return { banners: { mode: 'CAROUSEL', autoplaySeconds: 5, items: [] }, sections: [] }
  }
}

export async function getCategories(): Promise<PublicCategory[]> {
  'use cache'
  cacheLife('minutes')
  cacheTag('categories')
  try {
    return await getJson<PublicCategory[]>('/public/categories')
  } catch (err) {
    console.error('[storefront] categories unavailable:', err)
    return []
  }
}

/** null = category not found */
export async function getProducts(params: { category?: string; sort?: string; q?: string; filters?: ListingFilters }): Promise<ProductListing | null> {
  'use cache'
  cacheLife('minutes')
  const qs = params.filters ? filtersQuery(params.filters) : new URLSearchParams()
  if (params.category) qs.set('category', params.category)
  if (params.sort) qs.set('sort', params.sort)
  if (params.q) qs.set('q', params.q)
  const res = await fetch(`${API_URL}/public/products?${qs}`)
  if (res.status === 404) return null
  if (!res.ok) return { category: null, sort: params.sort ?? 'LATEST', products: [] }
  return res.json() as Promise<ProductListing>
}

/** null = not found (or no longer for sale) */
export async function getProduct(sellerSlug: string, slug: string): Promise<ProductDetail | null> {
  'use cache'
  cacheLife('minutes')
  cacheTag(`product:${sellerSlug}/${slug}`)
  const res = await fetch(`${API_URL}/public/products/${encodeURIComponent(sellerSlug)}/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Product ${sellerSlug}/${slug} failed with ${res.status}`)
  return res.json() as Promise<ProductDetail>
}
