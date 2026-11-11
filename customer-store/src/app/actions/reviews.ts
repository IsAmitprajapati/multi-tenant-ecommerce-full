'use server'

import { updateTag } from 'next/cache'

/**
 * After a shopper posts, edits or deletes a review: expire this product's cached page data
 * so the rating next to the title and the first page of reviews show the change right away.
 * (Only expires a cache entry — anyone calling it just causes a fresh fetch.)
 */
export async function refreshProductReviews(sellerSlug: string, slug: string) {
  const ok = (v: unknown) => typeof v === 'string' && /^[a-z0-9-]{1,120}$/.test(v)
  if (!ok(sellerSlug) || !ok(slug)) return
  updateTag(`product:${sellerSlug}/${slug}`)
  updateTag(`reviews:${sellerSlug}/${slug}`)
}
