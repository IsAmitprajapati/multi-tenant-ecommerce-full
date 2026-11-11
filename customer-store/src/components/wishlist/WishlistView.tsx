'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Check, Heart, Info } from 'lucide-react'
import { API_URL } from '@/lib/config'
import { api } from '@/lib/auth/client'
import { useWishlist } from '@/lib/wishlist/WishlistProvider'
import { useCart } from '@/lib/cart/CartProvider'
import { productHref } from '@/lib/format'
import ProductCard from '@/components/home/ProductCard'
import ListingSkeleton from '@/components/home/ListingSkeleton'
import { FormAlert, Spinner } from '@/components/auth/fields'
import type { ProductCard as Card } from '@/lib/types'

/** "Add to cart" under each saved product (design) */
function CardAction({ p, onAdded }: { p: Card; onAdded: () => void }) {
  const { add } = useCart()
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const base = 'mx-3 mb-3 flex w-[calc(100%-1.5rem)] items-center justify-center gap-1.5 rounded-md border-[1.5px] py-2 text-xs font-bold'
  if (!p.inStock) return <span className={`${base} border-n-200 bg-n-50 text-n-400`}>Out of stock</span>
  if (p.hasVariants) return <Link href={productHref(p)} className={`${base} border-brand-600 bg-white text-brand-700 hover:bg-brand-100`}>Choose options</Link>
  return (
    <button type='button' disabled={state === 'busy'}
      onClick={async () => {
        setState('busy')
        try { await add(p.id, null, 1); setState('done'); onAdded() } catch { setState('error') }
      }}
      className={`${base} cursor-pointer ${state === 'done' ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : state === 'error' ? 'border-error/40 text-[#B23139]' : 'border-brand-600 bg-white text-brand-700 hover:bg-brand-100'}`}>
      {state === 'busy' ? <Spinner /> : state === 'done' ? <><Check className='size-3.5' /> Added to cart</> : state === 'error' ? 'Couldn’t add — retry' : 'Add to cart'}
    </button>
  )
}

/** Wishlist page (Wishlist design) */
export default function WishlistView() {
  const { ids, ready, signedIn, remove } = useWishlist()
  const { add } = useCart()
  const [cards, setCards] = useState<Record<string, Card>>({})
  const [loaded, setLoaded] = useState(false)
  const [moving, setMoving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: React.ReactNode } | null>(null)

  // Fetch cards for saved ids we don't have yet (removals just drop out locally)
  const missing = useMemo(() => ids.filter((id) => !cards[id]), [ids, cards])
  const missingKey = missing.join(',')
  useEffect(() => {
    if (!ready) return
    if (!missingKey) { const t = window.setTimeout(() => setLoaded(true), 0); return () => window.clearTimeout(t) }
    let cancelled = false
    const productIds = missingKey.split(',')
    const req = signedIn
      ? api<{ items: Card[] }>('/wishlist').then((r) => r.items)
      : fetch(`${API_URL}/public/products/cards`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productIds }) })
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<Card[]> })
    req.then((list) => {
      if (cancelled) return
      setCards((prev) => ({ ...prev, ...Object.fromEntries(list.map((c) => [c.id, c])) }))
      setLoaded(true)
    }).catch(() => { if (!cancelled) { setNotice({ tone: 'error', text: 'Couldn’t load your wishlist. Please refresh.' }); setLoaded(true) } })
    return () => { cancelled = true }
  }, [ready, signedIn, missingKey])

  // Saved items still for sale, newest first (ones taken off sale simply don't show)
  const items = ids.flatMap((id) => (cards[id] ? [cards[id]!] : []))
  const movable = items.filter((p) => p.inStock && !p.hasVariants)

  const moveAll = async () => {
    setMoving(true)
    setNotice(null)
    let moved = 0
    for (const p of movable) {
      try { await add(p.id, null, 1); await remove(p.id); moved++ } catch { /* leave it in the wishlist */ }
    }
    const left = items.length - moved
    setNotice({
      tone: moved ? 'success' : 'error',
      text: moved
        ? <>Moved {moved} {moved === 1 ? 'item' : 'items'} to your cart. <Link href='/cart' className='underline'>View cart</Link>{left > 0 && <> · {left} stayed here (out of stock or needs an option chosen).</>}</>
        : 'Nothing could be moved — items are out of stock or need an option chosen.',
    })
    setMoving(false)
  }

  const loading = !ready || (!loaded && ids.length > 0)

  return (
    <div className='mx-auto w-full max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <nav className='text-xs text-n-600' aria-label='Breadcrumb'>
        {signedIn ? <Link href='/account' className='hover:text-brand-600'>Account</Link> : <Link href='/' className='hover:text-brand-600'>Home</Link>}
        {' / '}<span className='font-semibold text-n-900'>Wishlist</span>
      </nav>
      <div className='mt-2 flex flex-wrap items-center justify-between gap-3'>
        <h1 className='text-[22px] font-bold'>My wishlist{!loading && <span className='font-normal text-n-600'> · {items.length} {items.length === 1 ? 'item' : 'items'}</span>}</h1>
        {!loading && movable.length > 0 && (
          <button type='button' onClick={moveAll} disabled={moving} className='btn-primary px-4.5 py-2.5 text-[13px]'>
            {moving && <Spinner />} Move all to cart
          </button>
        )}
      </div>

      {!signedIn && ready && items.length > 0 && (
        <p className='mt-4 flex items-center gap-2 rounded-lg bg-n-100 px-3.5 py-2.5 text-xs text-n-600'>
          <Info className='size-4 shrink-0' /> Saved on this device. <Link href='/login?next=%2Fwishlist' className='link'>Log in</Link> to keep your wishlist on every device.
        </p>
      )}
      {notice && <div className='mt-4'><FormAlert tone={notice.tone}>{notice.text}</FormAlert></div>}

      <div className='mt-5'>
        {loading ? <ListingSkeleton /> : items.length === 0 ? (
          <div className='rounded-card bg-white px-6 py-16 text-center'>
            <Heart className='mx-auto size-11 text-n-400' />
            <p className='mt-4 text-[15px] font-semibold'>Your wishlist is empty</p>
            <p className='mt-1 text-[13px] text-n-600'>Save items you love to find them here later. Tap the ♡ on any product.</p>
            <Link href='/' className='btn-primary mt-5 px-6 py-2.5 text-[13px]'>Start shopping</Link>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5'>
            {items.map((p) => (
              <ProductCard key={p.id} p={p} footer={<CardAction p={p} onAdded={() => setNotice(null)} />} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

