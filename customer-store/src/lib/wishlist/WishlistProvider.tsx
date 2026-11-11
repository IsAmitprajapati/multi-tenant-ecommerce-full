'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../auth/client'
import { useAuth } from '../auth/AuthProvider'

/**
 * Saved products (hearts).
 *  - Signed in: stored on the server.
 *  - Guest: product ids kept in this browser; merged into the account on login.
 * Toggling is optimistic — the heart fills instantly and rolls back if the server refuses.
 */
const KEY = 'marketplace.wishlist'
const MAX = 200

const readGuest = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, MAX) : []
  } catch { return [] }
}
const writeGuest = (ids: string[]) => { try { localStorage.setItem(KEY, JSON.stringify(ids)) } catch { /* storage blocked */ } }

interface WishlistContextValue {
  /** Newest first */
  ids: string[]
  count: number
  ready: boolean
  signedIn: boolean
  has: (productId: string) => boolean
  /** Returns the new state (true = saved) */
  toggle: (productId: string) => Promise<boolean>
  remove: (productId: string) => Promise<void>
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth()
  const signedIn = status === 'authenticated' && user?.userType === 'CUSTOMER'
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const mergedFor = useRef<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    let cancelled = false
    const run = async () => {
      try {
        if (signedIn && user) {
          if (mergedFor.current !== user.id) {
            mergedFor.current = user.id
            const guest = readGuest()
            if (guest.length) {
              const merged = await api<{ productIds: string[] }>('/wishlist/merge', { method: 'POST', json: { productIds: guest } })
              writeGuest([])
              if (!cancelled) setIds(merged.productIds)
              return
            }
          }
          const res = await api<{ productIds: string[] }>('/wishlist')
          if (!cancelled) setIds(res.productIds)
        } else {
          mergedFor.current = null
          if (!cancelled) setIds(readGuest())
        }
      } catch { /* keep what we had */ } finally { if (!cancelled) setReady(true) }
    }
    run()
    return () => { cancelled = true }
  }, [status, signedIn, user])

  // Guest wishlist changed in another tab
  useEffect(() => {
    if (signedIn) return
    const on = (e: StorageEvent) => { if (e.key === KEY) setIds(readGuest()) }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [signedIn])

  const idsRef = useRef(ids)
  useEffect(() => { idsRef.current = ids }, [ids])

  const apply = useCallback(async (productId: string, save: boolean) => {
    const prev = idsRef.current
    const next = save ? [productId, ...prev.filter((x) => x !== productId)].slice(0, MAX) : prev.filter((x) => x !== productId)
    setIds(next)
    if (!signedIn) { writeGuest(next); return }
    try {
      const res = save
        ? await api<{ productIds: string[] }>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'PUT' })
        : await api<{ productIds: string[] }>(`/wishlist/${encodeURIComponent(productId)}`, { method: 'DELETE' })
      setIds(res.productIds)
    } catch (err) {
      setIds(prev) // roll back
      throw err
    }
  }, [signedIn])

  const has = useCallback((productId: string) => ids.includes(productId), [ids])
  const toggle = useCallback(async (productId: string) => {
    const save = !idsRef.current.includes(productId)
    await apply(productId, save)
    return save
  }, [apply])
  const remove = useCallback((productId: string) => apply(productId, false), [apply])

  const value = useMemo(() => ({ ids, count: ids.length, ready, signedIn, has, toggle, remove }), [ids, ready, signedIn, has, toggle, remove])
  return <WishlistContext value={value}>{children}</WishlistContext>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside <WishlistProvider>')
  return ctx
}
