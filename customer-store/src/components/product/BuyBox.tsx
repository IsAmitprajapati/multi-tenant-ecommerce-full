'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Info, MapPin, Minus, Plus } from 'lucide-react'
import { inr } from '@/lib/format'
import { useCart } from '@/lib/cart/CartProvider'
import { errorMessage } from '@/lib/auth/client'
import { Spinner } from '@/components/auth/fields'
import { RatingChip } from '@/components/reviews/Stars'
import { RATING_EVENT } from '@/components/reviews/ReviewsSection'
import { saveDeliveryLocation, useDeliveryLocation } from '@/components/layout/LocationPicker'
import type { ProductDetail } from '@/lib/types'

type Option = { id: string | null; name: string | null; price: number; mrp: number | null; inStock: boolean; maxQty: number; lowStock: boolean }

const offPct = (price: number, mrp: number | null) => (mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0)

/** Sticky purchase panel: price, options, quantity, delivery check */
export default function BuyBox({ product }: { product: ProductDetail }) {
  const options: Option[] = product.variants.length
    ? product.variants
    : [{ id: null, name: null, price: product.price, mrp: product.mrp, inStock: product.inStock, maxQty: product.maxQty, lowStock: product.lowStock }]
  // Start on the first option that's in stock
  const [selected, setSelected] = useState(() => Math.max(0, options.findIndex((o) => o.inStock)))
  const [qty, setQty] = useState(1)
  const opt = options[selected]!

  // Updates straight away when the shopper posts/edits/deletes a review below
  const [liveRating, setLiveRating] = useState<{ average: number; count: number } | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ productId: string; average: number; count: number }>).detail
      if (d.productId === product.id) setLiveRating({ average: d.average, count: d.count })
    }
    window.addEventListener(RATING_EVENT, on)
    return () => window.removeEventListener(RATING_EVENT, on)
  }, [product.id])
  const rating = liveRating ?? product.rating
  const off = offPct(opt.price, opt.mrp)

  // Add to cart / Buy now (Buy now goes straight to the cart; checkout follows from there)
  const { add } = useCart()
  const router = useRouter()
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null)
  const [added, setAdded] = useState<{ ok: boolean; text: string } | null>(null)
  const addToCart = async (buyNow: boolean) => {
    setBusy(buyNow ? 'buy' : 'add')
    setAdded(null)
    try {
      const message = await add(product.id, opt.id, qty)
      if (buyNow) { router.push('/cart'); return }
      setAdded({ ok: true, text: message })
    } catch (err) {
      setAdded({ ok: false, text: errorMessage(err) })
    } finally { setBusy(null) }
  }

  const pick = (i: number) => {
    setSelected(i)
    setQty((q) => Math.max(1, Math.min(q, options[i]!.maxQty || 1)))
  }

  return (
    <div className='flex flex-col gap-5 lg:sticky lg:top-[92px]'>
      <div className='card'>
        <Link href={`/seller/${product.seller.slug}`} className='text-[11px] font-semibold tracking-[0.05em] text-brand-600 uppercase hover:text-brand-500'>
          Sold by {product.seller.name}
        </Link>
        <h1 className='mt-1.5 text-[22px] leading-tight font-bold'>{product.title}</h1>
        {product.brand && <p className='mt-1 text-[13px] text-n-600'>Brand: <span className='font-medium text-n-900'>{product.brand}</span></p>}
        {/* Rating chip (design) — jumps to the reviews */}
        <a href='#reviews' className='mt-2.5 inline-flex items-center gap-2 text-xs text-n-600 hover:text-brand-700'>
          {rating.count > 0
            ? <><RatingChip value={rating.average} className='px-2 py-0.5 text-xs' /> {rating.count.toLocaleString('en-IN')} {rating.count === 1 ? 'rating' : 'ratings'}</>
            : <span>No ratings yet · <span className='font-semibold text-brand-600'>Be the first to review</span></span>}
        </a>

        <div className='mt-3.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1'>
          <span className='text-[26px] font-bold'>{inr(opt.price)}</span>
          {off > 0 && <>
            <span className='text-sm text-n-600 line-through'>{inr(opt.mrp!)}</span>
            <span className='text-[13px] font-bold text-brand-600'>{off}% off</span>
          </>}
        </div>
        <p className='mt-0.5 text-[11px] text-n-600'>Inclusive of all taxes</p>

        {product.variants.length > 0 && (
          <div className='mt-5'>
            <div className='mb-2 text-xs font-semibold'>Option — {opt.name}</div>
            <div className='flex flex-wrap gap-2' role='radiogroup' aria-label='Options'>
              {options.map((o, i) => (
                <button key={o.id ?? i} type='button' role='radio' aria-checked={i === selected} onClick={() => pick(i)}
                  className={`cursor-pointer rounded-lg border-[1.5px] px-3.5 py-2 text-xs font-semibold transition-colors ${i === selected ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white hover:border-brand-600'} ${o.inStock ? '' : 'text-n-400 line-through decoration-n-400'}`}>
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {opt.inStock ? (
          <div className='mt-5 flex items-center justify-between'>
            <span className='text-xs font-semibold'>Quantity</span>
            <div className='flex items-center gap-3 rounded-lg border-[1.5px] border-n-200 px-2.5 py-1.5'>
              <button type='button' onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label='Decrease quantity' className='cursor-pointer text-n-900 disabled:cursor-not-allowed disabled:text-n-400'><Minus className='size-4' /></button>
              <span className='w-5 text-center text-[13px] font-bold tabular-nums' aria-live='polite'>{qty}</span>
              <button type='button' onClick={() => setQty((q) => Math.min(opt.maxQty, q + 1))} disabled={qty >= opt.maxQty} aria-label='Increase quantity' className='cursor-pointer text-n-900 disabled:cursor-not-allowed disabled:text-n-400'><Plus className='size-4' /></button>
            </div>
          </div>
        ) : (
          <div className='mt-5 flex items-center gap-2 rounded-lg bg-n-50 px-3.5 py-3 text-[13px] font-semibold text-n-600'><AlertCircle className='size-4' /> Out of stock{product.variants.length ? ' in this option' : ''}</div>
        )}
        {opt.inStock && opt.lowStock && <p className='mt-2 text-right text-xs font-semibold text-[#B76E00]'>Only {opt.maxQty} left</p>}

        <div className='mt-5 flex gap-2.5'>
          <button type='button' onClick={() => addToCart(false)} disabled={!opt.inStock || busy !== null}
            className='btn flex-1 border-[1.5px] border-brand-600 bg-white py-3 text-[13px] text-brand-700 hover:bg-brand-100'>
            {busy === 'add' && <Spinner />} Add to cart
          </button>
          <button type='button' onClick={() => addToCart(true)} disabled={!opt.inStock || busy !== null} className='btn-primary flex-1 py-3 text-[13px]'>
            {busy === 'buy' && <Spinner />} Buy now
          </button>
        </div>
        {added && (
          <p role='status' className={`mt-3 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-semibold ${added.ok ? 'bg-brand-100 text-[#155C3B]' : 'bg-error/10 text-[#B23139]'}`}>
            <span className='flex items-center gap-1.5'>{added.ok ? <CheckCircle2 className='size-4' /> : <AlertCircle className='size-4' />} {added.text}</span>
            {added.ok && <Link href='/cart' className='shrink-0 underline-offset-2 hover:underline'>View cart</Link>}
          </p>
        )}
      </div>

      <DeliveryCheck product={product} />
    </div>
  )
}

type Result = { tone: 'ok' | 'no' | 'info'; text: string }

function deliveryResult(product: ProductDetail, pin: string): Result {
  const { scope, pincodes } = product.delivery
  if (scope === 'PAN_INDIA') return { tone: 'ok', text: `Delivers to ${pin}` }
  if (scope === 'SPECIFIC_PINCODES') {
    return pincodes.includes(pin) ? { tone: 'ok', text: `Delivers to ${pin}` } : { tone: 'no', text: `${product.seller.name} doesn’t deliver this item to ${pin} yet` }
  }
  return { tone: 'info', text: `${product.seller.name} delivers this item in its local area. We’ll confirm ${pin} at checkout.` }
}

function DeliveryCheck({ product }: { product: ProductDetail }) {
  const saved = useDeliveryLocation()
  const [input, setInput] = useState<string | null>(null)
  const [checked, setChecked] = useState<string | null>(null)
  const [error, setError] = useState('')
  const pin = input ?? saved?.pincode ?? ''
  // The header location counts as checked until the shopper types another pincode
  const active = checked ?? (input === null ? saved?.pincode ?? null : null)
  const result = active ? deliveryResult(product, active) : null

  const check = (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[1-9]\d{5}$/.test(pin)) { setError('Enter a valid 6-digit pincode'); return }
    setError('')
    setChecked(pin)
    if (pin !== saved?.pincode) saveDeliveryLocation({ pincode: pin, label: '' })
  }

  const Icon = result?.tone === 'ok' ? CheckCircle2 : result?.tone === 'no' ? AlertCircle : Info
  const color = result?.tone === 'ok' ? 'text-[#155C3B]' : result?.tone === 'no' ? 'text-[#B23139]' : 'text-n-600'

  return (
    <form onSubmit={check} className='card' noValidate>
      <div className='mb-2.5 flex items-center gap-1.5 text-[13px] font-semibold'><MapPin className='size-4 text-brand-600' /> Check delivery availability</div>
      <div className='flex gap-2'>
        <input value={pin} onChange={(e) => { setInput(e.target.value.replace(/\D/g, '')); setChecked(null); setError('') }}
          inputMode='numeric' maxLength={6} placeholder='Enter pincode' aria-label='Pincode' aria-invalid={!!error || undefined}
          className='field min-w-0 flex-1 py-2 text-[13px] tracking-wider' />
        <button type='submit' className='btn shrink-0 border-[1.5px] border-brand-600 bg-white px-3.5 py-2 text-xs text-brand-700 hover:bg-brand-100'>Check</button>
      </div>
      {error && <p className='mt-2 text-xs text-error'>{error}</p>}
      {result && !error && (
        <p className={`mt-3 flex items-start gap-2 text-xs font-semibold ${color}`} role='status'><Icon className='mt-px size-4 shrink-0' /> {result.text}</p>
      )}
    </form>
  )
}
