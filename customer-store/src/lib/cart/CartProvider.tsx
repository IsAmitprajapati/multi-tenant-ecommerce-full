'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { API_URL } from '../config'
import { api, ApiError } from '../auth/client'
import { useAuth } from '../auth/AuthProvider'
import type { Cart } from '../types'

/**
 * The shopper's cart.
 *  - Signed in: stored on the server (follows them across devices).
 *  - Guest: lines kept in this browser; the server prices them (live price & stock) on every change.
 *  - On login/sign-up the guest cart is merged into the account.
 */
interface GuestLine { productId: string; variantId: string | null; quantity: number; savedForLater: boolean }

const KEY = 'marketplace.cart'
const MAX_QTY = 10

const readGuest = (): GuestLine[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((l) => l && typeof l.productId === 'string').slice(0, 50) : []
  } catch { return [] }
}
const writeGuest = (lines: GuestLine[]) => { try { localStorage.setItem(KEY, JSON.stringify(lines)) } catch { /* storage blocked */ } }
const guestId = (l: { productId: string; variantId: string | null }) => `${l.productId}:${l.variantId ?? ''}`

interface CartContextValue {
  cart: Cart | null
  /** Items in the cart (not saved for later, in stock) */
  count: number
  loading: boolean
  add: (productId: string, variantId: string | null, quantity: number) => Promise<string>
  setQuantity: (lineId: string, quantity: number) => Promise<void>
  setSaved: (lineId: string, saved: boolean) => Promise<void>
  remove: (lineId: string) => Promise<void>
  refresh: () => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const signedIn = status === 'authenticated' && user?.userType === 'CUSTOMER'
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const mergedFor = useRef<string | null>(null)

  const quoteGuest = useCallback(async (lines: GuestLine[]) => {
    const res = await fetch(`${API_URL}/public/cart/quote`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ items: lines }),
    })
    if (!res.ok) throw new ApiError('Couldn’t load your cart', res.status)
    return (await res.json()) as Cart
  }, [])

  const refresh = useCallback(async () => {
    try {
      setCart(signedIn ? await api<Cart>('/cart') : await quoteGuest(readGuest()))
    } catch { /* keep what we had */ } finally { setLoading(false) }
  }, [signedIn, quoteGuest])

  // Load once auth is known; on login, fold the guest cart into the account first
  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    const run = async () => {
      if (signedIn && user && mergedFor.current !== user.id) {
        mergedFor.current = user.id
        const guest = readGuest()
        if (guest.length) {
          try {
            const merged = await api<Cart>('/cart/merge', { method: 'POST', json: { items: guest } })
            writeGuest([])
            if (!cancelled) { setCart(merged); setLoading(false) }
            return
          } catch { /* fall through to a normal load; guest lines stay for next time */ }
        }
      }
      if (!signedIn) mergedFor.current = null
      if (!cancelled) await refresh()
    }
    run()
    return () => { cancelled = true }
  }, [status, signedIn, user, refresh])

  // Guest cart changed in another tab
  useEffect(() => {
    if (signedIn) return
    const on = (e: StorageEvent) => { if (e.key === KEY) refresh() }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [signedIn, refresh])

  const updateGuest = useCallback(async (fn: (lines: GuestLine[]) => GuestLine[]) => {
    const next = fn(readGuest())
    writeGuest(next)
    setCart(await quoteGuest(next))
  }, [quoteGuest])

  const add = useCallback(async (productId: string, variantId: string | null, quantity: number) => {
    if (signedIn) {
      const res = await api<{ message: string; cart: Cart }>('/cart/items', { method: 'POST', json: { productId, variantId, quantity } })
      setCart(res.cart)
      return res.message
    }
    let capped = false
    await updateGuest((lines) => {
      const id = guestId({ productId, variantId })
      const existing = lines.find((l) => guestId(l) === id)
      const base = existing && !existing.savedForLater ? existing.quantity : 0
      const qty = Math.min(base + quantity, MAX_QTY)
      capped = qty < base + quantity
      return existing
        ? lines.map((l) => (guestId(l) === id ? { ...l, quantity: qty, savedForLater: false } : l))
        : [...lines, { productId, variantId, quantity: qty, savedForLater: false }]
    })
    return capped ? `You can buy up to ${MAX_QTY} of this item — your cart has the maximum` : 'Added to cart'
  }, [signedIn, updateGuest])

  const setQuantity = useCallback(async (lineId: string, quantity: number) => {
    if (signedIn) { setCart(await api<Cart>(`/cart/items/${lineId}`, { method: 'PATCH', json: { quantity } })); return }
    await updateGuest((lines) => lines.map((l) => (guestId(l) === lineId ? { ...l, quantity: Math.max(1, Math.min(quantity, MAX_QTY)) } : l)))
  }, [signedIn, updateGuest])

  const setSaved = useCallback(async (lineId: string, saved: boolean) => {
    if (signedIn) { setCart(await api<Cart>(`/cart/items/${lineId}`, { method: 'PATCH', json: { savedForLater: saved } })); return }
    await updateGuest((lines) => lines.map((l) => (guestId(l) === lineId ? { ...l, savedForLater: saved } : l)))
  }, [signedIn, updateGuest])

  const remove = useCallback(async (lineId: string) => {
    if (signedIn) { setCart(await api<Cart>(`/cart/items/${lineId}`, { method: 'DELETE' })); return }
    await updateGuest((lines) => lines.filter((l) => guestId(l) !== lineId))
  }, [signedIn, updateGuest])

  const value = useMemo(() => ({
    cart, loading, count: cart?.summary.itemCount ?? 0, add, setQuantity, setSaved, remove, refresh,
  }), [cart, loading, add, setQuantity, setSaved, remove, refresh])

  return <CartContext value={value}>{children}</CartContext>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
