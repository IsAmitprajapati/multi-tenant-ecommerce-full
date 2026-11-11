'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { AlertCircle, ImageOff, Info, Minus, Plus, ShoppingCart, Truck } from 'lucide-react'
import { useCart } from '@/lib/cart/CartProvider'
import { errorMessage } from '@/lib/auth/client'
import { inr } from '@/lib/format'
import { Spinner } from '@/components/auth/fields'
import type { CartLine } from '@/lib/types'

function Thumb({ line }: { line: CartLine }) {
  const img = (
    <span className='relative flex size-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-n-100'>
      {line.imageUrl
        ? <Image src={line.imageUrl} alt='' fill sizes='76px' className={`object-cover ${line.status === 'OK' ? '' : 'opacity-50 grayscale'}`} />
        : <ImageOff className='size-5 text-n-400' />}
    </span>
  )
  return line.slug && line.seller ? <Link href={`/p/${line.seller.slug}/${line.slug}`}>{img}</Link> : img
}

function LineTitle({ line }: { line: CartLine }) {
  return line.slug && line.seller
    ? <Link href={`/p/${line.seller.slug}/${line.slug}`} className='text-sm font-semibold hover:text-brand-700'>{line.title}</Link>
    : <span className='text-sm font-semibold'>{line.title}</span>
}

/** One cart line: stepper, Save for later, Remove, line total (design) */
function CartItem({ line }: { line: CartLine }) {
  const { setQuantity, setSaved, remove } = useCart()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what); setError('')
    try { await fn() } catch (err) { setError(errorMessage(err)) } finally { setBusy(null) }
  }
  const ok = line.status === 'OK'

  return (
    <div className={`flex gap-3.5 rounded-xl border bg-white p-4 ${ok ? 'border-n-200' : 'border-error/30'}`}>
      <Thumb line={line} />
      <div className='min-w-0 flex-1'>
        <LineTitle line={line} />
        {line.variantName && <div className='mt-0.5 text-xs text-n-600'>{line.variantName}</div>}
        {!ok && (
          <p className='mt-1 flex items-center gap-1 text-xs font-semibold text-[#B23139]'>
            <AlertCircle className='size-3.5' /> {line.status === 'OUT_OF_STOCK' ? 'Out of stock' : 'No longer available'} — not included in your total
          </p>
        )}
        {ok && line.quantityReduced && (
          <p className='mt-1 text-xs font-semibold text-[#B76E00]'>Only {line.maxQty} available — quantity updated</p>
        )}
        <div className='mt-3 flex flex-wrap items-center justify-between gap-3'>
          {ok ? (
            <div className='flex items-center gap-3 rounded-lg border-[1.5px] border-n-200 px-2.5 py-1.5' aria-busy={busy === 'qty'}>
              <button type='button' aria-label={`Decrease quantity of ${line.title}`} disabled={line.quantity <= 1 || !!busy}
                onClick={() => run('qty', () => setQuantity(line.id, line.quantity - 1))} className='cursor-pointer disabled:cursor-not-allowed disabled:text-n-400'>
                <Minus className='size-4' />
              </button>
              <span className='w-5 text-center text-[13px] font-bold tabular-nums' aria-live='polite'>{busy === 'qty' ? <Spinner /> : line.quantity}</span>
              <button type='button' aria-label={`Increase quantity of ${line.title}`} disabled={line.quantity >= line.maxQty || !!busy}
                onClick={() => run('qty', () => setQuantity(line.id, line.quantity + 1))} className='cursor-pointer disabled:cursor-not-allowed disabled:text-n-400'>
                <Plus className='size-4' />
              </button>
            </div>
          ) : <span />}
          <div className='flex items-center gap-4'>
            {line.status !== 'UNAVAILABLE' && (
              <button type='button' disabled={!!busy} onClick={() => run('save', () => setSaved(line.id, true))} className='link cursor-pointer text-xs disabled:opacity-50'>
                {busy === 'save' ? 'Saving…' : 'Save for later'}
              </button>
            )}
            <button type='button' disabled={!!busy} onClick={() => run('remove', () => remove(line.id))} className='cursor-pointer text-xs font-semibold text-n-600 hover:text-n-900 disabled:opacity-50'>
              {busy === 'remove' ? 'Removing…' : 'Remove'}
            </button>
          </div>
        </div>
        {error && <p className='mt-2 text-xs text-error'>{error}</p>}
      </div>
      <div className='shrink-0 text-right'>
        <div className={`text-[15px] font-bold ${ok ? '' : 'text-n-400 line-through'}`}>{inr(line.lineTotal)}</div>
        {ok && line.mrp && <div className='text-xs text-n-600 line-through'>{inr(line.mrp * line.quantity)}</div>}
        {ok && line.quantity > 1 && <div className='mt-0.5 text-[11px] text-n-600'>{inr(line.unitPrice)} each</div>}
      </div>
    </div>
  )
}

function SavedItem({ line }: { line: CartLine }) {
  const { setSaved, remove } = useCart()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const run = async (what: string, fn: () => Promise<void>) => {
    setBusy(what); setError('')
    try { await fn() } catch (err) { setError(errorMessage(err)) } finally { setBusy(null) }
  }
  return (
    <div className='flex gap-3.5 rounded-xl border border-n-200 bg-white p-4'>
      <Thumb line={line} />
      <div className='min-w-0 flex-1'>
        <LineTitle line={line} />
        {line.variantName && <div className='mt-0.5 text-xs text-n-600'>{line.variantName}</div>}
        <div className='mt-1.5 text-[13px] font-bold'>{inr(line.unitPrice)}</div>
        {line.status !== 'OK' && <p className='mt-1 text-xs font-semibold text-[#B23139]'>{line.status === 'OUT_OF_STOCK' ? 'Out of stock' : 'No longer available'}</p>}
        {error && <p className='mt-1 text-xs text-error'>{error}</p>}
      </div>
      <div className='flex shrink-0 flex-col items-end gap-2'>
        {line.status === 'OK' && (
          <button type='button' disabled={!!busy} onClick={() => run('move', () => setSaved(line.id, false))} className='link cursor-pointer text-xs disabled:opacity-50'>
            {busy === 'move' ? 'Moving…' : 'Move to cart'}
          </button>
        )}
        <button type='button' disabled={!!busy} onClick={() => run('remove', () => remove(line.id))} className='cursor-pointer text-xs font-semibold text-n-600 hover:text-n-900 disabled:opacity-50'>
          {busy === 'remove' ? 'Removing…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

function CartSkeleton() {
  return (
    <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-8' aria-busy='true' aria-label='Loading cart'>
      <div className='grid gap-3'>{Array.from({ length: 3 }).map((_, i) => <div key={i} className='h-[110px] animate-pulse rounded-xl bg-n-100' />)}</div>
      <div className='h-72 animate-pulse rounded-xl bg-n-100' />
    </div>
  )
}

/** Cart page (Cart design) */
export default function CartView() {
  const { cart, loading } = useCart()
  const lines = cart ? cart.groups.reduce((n, g) => n + g.items.length, 0) + cart.unavailable.length : 0
  const s = cart?.summary

  return (
    // Same container as the home page
    <div className='mx-auto w-full max-w-[1440px] px-4 pt-5 pb-12 sm:px-8 lg:px-10 lg:pt-7'>
      <h1 className='text-[22px] font-bold'>My cart{s && s.itemCount > 0 && <span className='font-normal text-n-600'> · {s.itemCount} {s.itemCount === 1 ? 'item' : 'items'}</span>}</h1>

      <div className='mt-5'>
        {loading && !cart ? <CartSkeleton /> : !cart || (lines === 0 && cart.saved.length === 0) ? (
          <div className='card px-6 py-16 text-center'>
            <ShoppingCart className='mx-auto size-11 text-n-400' />
            <p className='mt-4 text-[15px] font-semibold'>Your cart is empty</p>
            <p className='mt-1 text-[13px] text-n-600'>Add items to see them here.</p>
            <Link href='/' className='btn-primary mt-5 px-6 py-2.5 text-[13px]'>Continue shopping</Link>
          </div>
        ) : (
          <div className='grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px] xl:gap-8'>
            <div className='min-w-0'>
              {lines === 0 ? (
                <div className='card text-center'>
                  <p className='text-sm font-semibold'>Nothing in your cart right now</p>
                  <p className='mt-1 text-[13px] text-n-600'>Move something from “Saved for later”, or keep shopping.</p>
                  <Link href='/' className='btn-outline mt-4 px-5 py-2 text-[13px]'>Continue shopping</Link>
                </div>
              ) : (
                <div className='flex flex-col gap-5'>
                  {cart.groups.map((g) => (
                    <section key={g.seller.slug} aria-label={`Items sold by ${g.seller.name}`}>
                      <div className='mb-2.5 flex items-center gap-2'>
                        <span className='size-[22px] rounded-md' style={{ background: g.seller.brandColor }} />
                        <span className='text-[13.5px] font-bold'>Sold by <Link href={`/seller/${g.seller.slug}`} className='hover:text-brand-700'>{g.seller.name}</Link></span>
                      </div>
                      <div className='flex flex-col gap-3'>{g.items.map((it) => <CartItem key={it.id} line={it} />)}</div>
                      <p className='mt-2 text-right text-[12.5px] text-n-600'>Subtotal from {g.seller.name}: <span className='font-semibold text-n-900'>{inr(g.subtotal)}</span></p>
                    </section>
                  ))}
                  {cart.unavailable.length > 0 && (
                    <section aria-label='Unavailable items' className='flex flex-col gap-3'>
                      {cart.unavailable.map((it) => <CartItem key={it.id} line={it} />)}
                    </section>
                  )}
                  {cart.groups.length > 1 && (
                    <p className='flex items-center gap-2 rounded-lg bg-n-100 px-3.5 py-2.5 text-xs text-n-600'>
                      <Info className='size-4 shrink-0' /> Items from different sellers arrive as separate deliveries, but you pay once at checkout.
                    </p>
                  )}
                </div>
              )}

              {cart.saved.length > 0 && (
                <section className='mt-7' aria-label='Saved for later'>
                  <h2 className='mb-3 text-sm font-bold'>Saved for later · {cart.saved.length}</h2>
                  <div className='flex flex-col gap-3'>{cart.saved.map((it) => <SavedItem key={it.id} line={it} />)}</div>
                </section>
              )}
            </div>

            {s && lines > 0 && (
              <aside className='flex flex-col gap-3.5 lg:sticky lg:top-[92px]' aria-label='Order summary'>
                <div className='card p-4.5 sm:p-4.5'>
                  <div className='mb-1.5 flex justify-between gap-3 text-xs'>
                    <span className='flex items-center gap-1.5 text-n-600'><Truck className='size-3.5' /> Free delivery on orders above {inr(s.freeDeliveryThreshold)}</span>
                    <span className='shrink-0 font-bold text-brand-600'>{s.amountToFreeDelivery > 0 ? `Add ${inr(s.amountToFreeDelivery)} more` : 'Unlocked!'}</span>
                  </div>
                  <div className='h-1.5 overflow-hidden rounded-full bg-n-100'>
                    <div className='h-full rounded-full bg-brand-600 transition-[width]' style={{ width: `${Math.min(100, Math.round((s.subtotal / s.freeDeliveryThreshold) * 100))}%` }} />
                  </div>
                </div>

                <div className='card flex flex-col gap-2.5 p-4.5 sm:p-4.5'>
                  <h2 className='mb-0.5 text-sm font-bold'>Bill summary</h2>
                  <div className='flex justify-between text-[13px] text-n-600'><span>Subtotal ({s.itemCount} {s.itemCount === 1 ? 'item' : 'items'})</span><span className='text-n-900'>{inr(s.subtotal)}</span></div>
                  {s.savings > 0 && <div className='flex justify-between text-[13px] text-brand-600'><span>You save on MRP</span><span>−{inr(s.savings)}</span></div>}
                  <div className='flex justify-between text-[13px] text-n-600'><span>Delivery fee</span><span className={s.deliveryFee === 0 ? 'font-semibold text-brand-600' : 'text-n-900'}>{s.deliveryFee === 0 ? 'FREE' : inr(s.deliveryFee)}</span></div>
                  <div className='flex justify-between text-[13px] text-n-600'><span>Taxes</span><span className='text-n-900'>Included in prices</span></div>
                  <div className='my-1 h-px bg-n-200' />
                  <div className='flex justify-between text-base font-bold'><span>Total</span><span>{inr(s.total)}</span></div>
                  <button type='button' disabled className='btn-primary mt-2 w-full py-3.5 text-sm'>Proceed to checkout</button>
                  <p className='text-center text-[11px] text-n-600'>{s.hasProblems ? 'Some items can’t be bought right now — they’re left out of the total.' : 'Checkout is coming next.'}</p>
                </div>
              </aside>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
