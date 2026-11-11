'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquarePlus, Pencil, Star, Trash2, X } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { useAuth } from '@/lib/auth/AuthProvider'
import { api, errorMessage } from '@/lib/auth/client'
import { initials } from '@/lib/format'
import { FormAlert, Spinner } from '@/components/auth/fields'
import { StarPicker, Stars } from './Stars'
import type { Review, ReviewPage } from '@/lib/types'
import { refreshProductReviews } from '@/app/actions/reviews'

type Sort = 'recent' | 'highest' | 'lowest'
const SORTS: { key: Sort; label: string }[] = [
  { key: 'recent', label: 'Most recent' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest', label: 'Lowest rated' },
]
const AVATAR_BG = ['#1B7A4F', '#2E77D0', '#B4436C', '#C27C2C', '#10543A', '#6B4FBB']
const avatarColor = (name: string) => AVATAR_BG[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length]
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

function ReviewItem({ r, mine, onEdit, onDelete }: { r: Review; mine?: boolean; onEdit?: () => void; onDelete?: () => void }) {
  return (
    <article className='border-t border-n-200 pt-4.5'>
      <div className='flex items-center gap-2.5'>
        <span className='flex size-[34px] shrink-0 items-center justify-center rounded-full text-xs font-bold text-white' style={{ background: avatarColor(r.author) }}>
          {initials(r.author)}
        </span>
        <div className='min-w-0 flex-1'>
          <div className='text-[13px] font-semibold'>{r.author}{mine && <span className='ml-2 rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700'>Your review</span>}</div>
          <div className='flex items-center gap-1.5 text-[11px] text-n-600'>
            {fmtDate(r.createdAt)}{r.edited && ' · edited'} · <Stars value={r.rating} size='size-3' />
          </div>
        </div>
        {mine && (
          <div className='flex gap-1'>
            <button type='button' onClick={onEdit} className='flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100'><Pencil className='size-3.5' /> Edit</button>
            <button type='button' onClick={onDelete} className='flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#B23139] hover:bg-error/5'><Trash2 className='size-3.5' /> Delete</button>
          </div>
        )}
      </div>
      {r.title && <p className='mt-2.5 text-[13px] font-bold'>{r.title}</p>}
      <p className={`${r.title ? 'mt-1' : 'mt-2.5'} text-[13px] leading-5 whitespace-pre-line text-n-900`}>{r.body}</p>
    </article>
  )
}

function ReviewForm({ productId, existing, onSaved, onCancel }: { productId: string; existing: Review | null; onSaved: (r: Review) => void; onCancel: () => void }) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [errors, setErrors] = useState<{ rating?: string; body?: string }>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!rating) next.rating = 'Choose a star rating'
    if (body.trim().length < 10) next.body = 'Write at least 10 characters about the product'
    setErrors(next)
    setFormError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      const res = await api<{ data: Review }>(`/reviews/products/${productId}`, { method: 'PUT', json: { rating, title: title.trim() || null, body: body.trim() } })
      onSaved(res.data)
    } catch (err) {
      setFormError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className='mt-5 rounded-xl border border-n-200 bg-n-50 p-4 sm:p-5'>
      <div className='flex items-center justify-between'>
        <h3 className='text-sm font-bold'>{existing ? 'Edit your review' : 'Write a review'}</h3>
        <button type='button' onClick={onCancel} aria-label='Close' className='flex size-7 cursor-pointer items-center justify-center rounded-lg text-n-600 hover:bg-white'><X className='size-4' /></button>
      </div>
      {formError && <div className='mt-3'><FormAlert>{formError}</FormAlert></div>}
      <div className='mt-3'>
        <StarPicker value={rating} onChange={(v) => { setRating(v); setErrors((x) => ({ ...x, rating: undefined })) }} invalid={!!errors.rating} />
        {errors.rating && <p className='mt-1 text-xs text-error'>{errors.rating}</p>}
      </div>
      <label className='mt-4 block'>
        <span className='field-label'>Title (optional)</span>
        <input className='field' maxLength={80} placeholder='Sum it up in a few words' value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className='mt-3 block'>
        <span className='field-label'>Your review</span>
        <textarea className='field min-h-28 resize-y' maxLength={2000} placeholder='What did you like or dislike? How was the quality?' value={body}
          aria-invalid={!!errors.body || undefined} onChange={(e) => { setBody(e.target.value); setErrors((x) => ({ ...x, body: undefined })) }} />
        <span className='mt-1 flex justify-between text-xs'>
          <span className='text-error'>{errors.body}</span>
          <span className='text-n-600 tabular-nums'>{body.length}/2000</span>
        </span>
      </label>
      <p className='mt-1 text-[11px] text-n-600'>Your first name and last initial are shown with your review.</p>
      <div className='mt-4 flex gap-2.5'>
        <button type='submit' className='btn-primary px-5 py-2.5 text-[13px]' disabled={busy}>{busy && <Spinner />} {existing ? 'Save changes' : 'Post review'}</button>
        <button type='button' className='btn-outline px-4 py-2.5 text-[13px]' onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  )
}

/** "Ratings & reviews" on the product page (design): summary, breakdown, list, and the shopper's own review */
type Summary = ReviewPage['summary']
export const RATING_EVENT = 'marketplace:rating-changed'

/** Applies one review change to the summary right away (the server result follows) */
function adjustSummary(sum: Summary, remove: number | null, add: number | null): Summary {
  const distribution = sum.distribution.map((d) => ({
    ...d,
    count: d.count - (d.stars === remove ? 1 : 0) + (d.stars === add ? 1 : 0),
  }))
  const count = distribution.reduce((n, d) => n + d.count, 0)
  const total = distribution.reduce((n, d) => n + d.stars * d.count, 0)
  return { average: count ? Math.round((total / count) * 100) / 100 : 0, count, distribution }
}

/** Product page shows this many reviews, then "View all" */
export const PREVIEW_COUNT = 5

export default function ReviewsSection({ productId, sellerSlug, slug, initial, mode = 'preview', initialStars = null }: {
  productId: string; sellerSlug: string; slug: string; initial: ReviewPage
  /** preview: first 5 + "View all" (product page) · full: every review with "Show more" (reviews page) */
  mode?: 'preview' | 'full'
  /** Start filtered to this many stars (from ?rating= on the reviews page) */
  initialStars?: number | null
}) {
  const pageSize = mode === 'preview' ? PREVIEW_COUNT : 10
  const allReviewsHref = `/p/${sellerSlug}/${slug}/reviews`
  const { status, user } = useAuth()
  const router = useRouter()
  const [page, setPage] = useState<ReviewPage>(initial)
  const [sort, setSort] = useState<Sort>('recent')
  const [starFilter, setStarFilter] = useState<number | null>(initialStars)
  const [loading, setLoading] = useState(false)
  const [mine, setMine] = useState<Review | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const isCustomer = status === 'authenticated' && user?.userType === 'CUSTOMER'

  const load = useCallback(async (opts: { sort: Sort; rating: number | null; pageNo: number; append?: boolean }) => {
    setLoading(true)
    try {
      const qs = new URLSearchParams({ sort: opts.sort, page: String(opts.pageNo), pageSize: String(pageSize) })
      if (opts.rating) qs.set('rating', String(opts.rating))
      const res = await fetch(`${API_URL}/public/products/${encodeURIComponent(sellerSlug)}/${encodeURIComponent(slug)}/reviews?${qs}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(String(res.status))
      const next = (await res.json()) as ReviewPage
      setPage((prev) => (opts.append ? { ...next, items: [...prev.items, ...next.items] } : next))
    } catch {
      setNotice('Couldn’t load reviews. Please try again.')
    } finally { setLoading(false) }
  }, [sellerSlug, slug, pageSize])

  // The shopper's own review (shown first, with Edit / Delete)
  useEffect(() => {
    if (!isCustomer) return
    let cancelled = false
    api<{ data: Review | null }>(`/reviews/mine?productId=${encodeURIComponent(productId)}`)
      .then((r) => { if (!cancelled) setMine(r.data) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [isCustomer, productId])

  // Arriving from login with #write-review opens the form
  useEffect(() => {
    if (isCustomer && window.location.hash === '#write-review') {
      const t = window.setTimeout(() => { setFormOpen(true); sectionRef.current?.scrollIntoView({ behavior: 'smooth' }) }, 0)
      return () => window.clearTimeout(t)
    }
  }, [isCustomer])

  const changeSort = (s: Sort) => { setSort(s); load({ sort: s, rating: starFilter, pageNo: 1 }) }
  const changeStars = (stars: number | null) => { setStarFilter(stars); load({ sort, rating: stars, pageNo: 1 }) }

  /** Optimistic: update the summary here and tell the buy box, before the server confirms */
  const applyLocally = (remove: number | null, add: number | null) => {
    setPage((prev) => {
      const summary = adjustSummary(prev.summary, remove, add)
      window.dispatchEvent(new CustomEvent(RATING_EVENT, { detail: { productId, average: summary.average, count: summary.count } }))
      return { ...prev, summary }
    })
  }

  const saved = (r: Review) => {
    applyLocally(mine?.rating ?? null, r.rating)
    setMine(r)
    setFormOpen(false)
    setNotice(mine ? 'Review updated.' : 'Thanks — your review is live.')
    load({ sort, rating: starFilter, pageNo: 1 })
    // Expire the cached product page so the rating next to the title updates too
    refreshProductReviews(sellerSlug, slug).then(() => router.refresh()).catch(() => {})
  }

  const remove = async () => {
    if (!mine) return
    try {
      await api(`/reviews/${mine.id}`, { method: 'DELETE' })
      applyLocally(mine.rating, null)
      setMine(null)
      setConfirmDelete(false)
      setNotice('Your review was deleted.')
      load({ sort, rating: starFilter, pageNo: 1 })
      refreshProductReviews(sellerSlug, slug).then(() => router.refresh()).catch(() => {})
    } catch (err) { setNotice(errorMessage(err)) }
  }

  const { summary } = page
  const others = page.items.filter((r) => r.id !== mine?.id)
  const loginHref = `/login?next=${encodeURIComponent(`${mode === 'full' ? allReviewsHref : `/p/${sellerSlug}/${slug}`}#write-review`)}`

  return (
    <section ref={sectionRef} id='reviews' className='card scroll-mt-24' aria-labelledby='reviews-title'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <h2 id='reviews-title' className='text-[15px] font-bold'>Ratings &amp; reviews</h2>
        {!formOpen && (
          isCustomer
            ? <button type='button' onClick={() => { setFormOpen(true); setNotice('') }} className='btn-outline px-3.5 py-2 text-xs'>
              {mine ? <><Pencil className='size-3.5' /> Edit your review</> : <><MessageSquarePlus className='size-3.5' /> Write a review</>}
            </button>
            : status !== 'loading' && <Link href={loginHref} className='btn-outline px-3.5 py-2 text-xs'><MessageSquarePlus className='size-3.5' /> Log in to write a review</Link>
        )}
      </div>

      {summary.count > 0 ? (
        <div className='mt-5 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10'>
          <div className='shrink-0 text-center'>
            <div className='text-[40px] leading-none font-bold'>{summary.average.toFixed(1)}</div>
            <Stars value={summary.average} className='mt-2' />
            <div className='mt-1 text-xs text-n-600'>{summary.count.toLocaleString('en-IN')} {summary.count === 1 ? 'rating' : 'ratings'}</div>
          </div>
          <div className='flex flex-1 flex-col gap-1.5'>
            {summary.distribution.map((d) => {
              const pct = summary.count ? Math.round((d.count / summary.count) * 100) : 0
              const on = starFilter === d.stars
              return (
                <button key={d.stars} type='button' disabled={!d.count} onClick={() => changeStars(on ? null : d.stars)} aria-pressed={on}
                  aria-label={`${d.stars} stars: ${d.count} ${d.count === 1 ? 'review' : 'reviews'}${on ? ' (filtering)' : ''}`}
                  className={`group flex cursor-pointer items-center gap-2.5 rounded-md px-1 py-0.5 disabled:cursor-default ${on ? 'bg-brand-100' : 'hover:bg-n-50'}`}>
                  <span className='flex w-7 items-center gap-0.5 text-xs text-n-600'>{d.stars}<Star className='size-3' fill='currentColor' strokeWidth={0} /></span>
                  <span className='h-[7px] flex-1 overflow-hidden rounded-full bg-n-100'>
                    <span className='block h-full rounded-full bg-warning' style={{ width: `${pct}%` }} />
                  </span>
                  <span className='w-8 text-right text-xs text-n-600 tabular-nums'>{d.count}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        !formOpen && <p className='mt-4 text-[13px] text-n-600'>No reviews yet — be the first to share what you think.</p>
      )}

      {notice && <div className='mt-4'><FormAlert tone={/couldn|error/i.test(notice) ? 'error' : 'success'}>{notice}</FormAlert></div>}

      {formOpen && (
        <div id='write-review'>
          <ReviewForm productId={productId} existing={mine} onSaved={saved} onCancel={() => setFormOpen(false)} />
        </div>
      )}

      {confirmDelete && (
        <div className='mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-error/5 px-4 py-3'>
          <span className='text-[13px] font-semibold text-[#B23139]'>Delete your review? This can’t be undone.</span>
          <span className='flex gap-2'>
            <button type='button' onClick={() => setConfirmDelete(false)} className='btn-outline px-3 py-1.5 text-xs'>Cancel</button>
            <button type='button' onClick={remove} className='btn bg-error px-3 py-1.5 text-xs text-white hover:bg-[#cf3f44]'>Delete</button>
          </span>
        </div>
      )}

      {summary.count > 0 && (
        <div className='mt-6 flex flex-wrap items-center justify-between gap-3'>
          <span className='text-xs text-n-600'>
            {starFilter
              ? <>Showing {page.total} {starFilter}-star {page.total === 1 ? 'review' : 'reviews'} · <button type='button' onClick={() => changeStars(null)} className='link cursor-pointer'>Show all</button></>
              : <>{page.total} {page.total === 1 ? 'review' : 'reviews'}</>}
          </span>
          <label className='flex items-center gap-2 text-xs text-n-600'>
            Sort by
            <select value={sort} onChange={(e) => changeSort(e.target.value as Sort)}
              className='cursor-pointer rounded-lg border-[1.5px] border-n-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-n-900 outline-none focus:border-brand-600'>
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
        </div>
      )}

      <div className={`mt-4 flex flex-col gap-4.5 transition-opacity ${loading ? 'opacity-50' : ''}`} aria-busy={loading}>
        {mine && !formOpen && !starFilter && (
          <ReviewItem r={mine} mine onEdit={() => { setFormOpen(true); setNotice('') }} onDelete={() => setConfirmDelete(true)} />
        )}
        {others.map((r) => <ReviewItem key={r.id} r={r} />)}
      </div>

      {/* Product page: more than 5 reviews → link to the page with all of them */}
      {mode === 'preview' && page.total > PREVIEW_COUNT && (
        <div className='mt-5 border-t border-n-200 pt-4 text-center'>
          <Link href={`${allReviewsHref}${starFilter ? `?rating=${starFilter}` : ''}`} className='btn-outline px-5 py-2 text-[13px]'>
            View all {page.total} {starFilter ? `${starFilter}-star ` : ''}reviews
          </Link>
        </div>
      )}

      {mode === 'full' && page.hasMore && (
        <div className='mt-5 text-center'>
          <button type='button' disabled={loading} onClick={() => load({ sort, rating: starFilter, pageNo: page.page + 1, append: true })}
            className='btn-outline px-5 py-2 text-[13px]'>{loading && <Spinner />} Show more reviews</button>
        </div>
      )}
    </section>
  )
}
