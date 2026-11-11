'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Bell, ChevronRight, Heart, Home, Info, LayoutGrid, LifeBuoy, LogOut, MapPin, Menu, ShieldCheck, ShoppingCart, UserRound, X, type LucideIcon,
} from 'lucide-react'
import { API_URL, SITE_NAME } from '@/lib/config'
import { useAuth } from '@/lib/auth/AuthProvider'
import { useCart } from '@/lib/cart/CartProvider'
import { useWishlist } from '@/lib/wishlist/WishlistProvider'
import { initials } from '@/lib/format'
import CategoryIcon from '@/components/home/CategoryIcon'
import type { PublicCategory } from '@/lib/types'

function Row({ href, Icon, label, badge, onClick }: { href: string; Icon: LucideIcon; label: string; badge?: number; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className='flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-n-900 hover:bg-n-50'>
      <Icon className='size-[18px] text-n-600' />
      <span className='flex-1'>{label}</span>
      {!!badge && <span className='rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white tabular-nums'>{badge > 99 ? '99+' : badge}</span>}
    </Link>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className='border-t border-n-200 px-2 py-3'>
      <h2 className='px-3 pb-1.5 text-[11px] font-bold tracking-wider text-n-600 uppercase'>{title}</h2>
      {children}
    </section>
  )
}

/** Phones/tablets: ☰ in the header opens a menu drawer from the left */
export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<PublicCategory[] | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { status, user, logout } = useAuth()
  const { count: cartCount } = useCart()
  const { count: wishCount } = useWishlist()
  const signedIn = status === 'authenticated' && !!user

  useEffect(() => {
    const d = dialog.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  // Close when the page changes (e.g. browser back)
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) { setLastPath(pathname); setOpen(false) }

  // Categories load the first time the menu opens
  useEffect(() => {
    if (!open || categories) return
    let cancelled = false
    fetch(`${API_URL}/public/categories`).then((r) => (r.ok ? r.json() : [])).then((c: PublicCategory[]) => { if (!cancelled) setCategories(c) }).catch(() => { if (!cancelled) setCategories([]) })
    return () => { cancelled = true }
  }, [open, categories])

  const close = () => setOpen(false)

  return (
    <>
      <button type='button' onClick={() => setOpen(true)} aria-label='Open menu' aria-haspopup='dialog' aria-expanded={open}
        className='-ml-1.5 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg text-n-900 hover:bg-n-50 md:hidden'>
        <Menu className='size-[22px]' />
      </button>

      <dialog ref={dialog} onClose={close} onClick={(e) => { if (e.target === dialog.current) close() }} aria-label='Menu'
        className='m-0 h-dvh max-h-dvh w-[min(320px,86vw)] max-w-none bg-white p-0 text-n-900 backdrop:bg-n-900/45 open:animate-drawer-in md:hidden'>
        <div className='flex h-full flex-col'>
          <div className='flex items-center justify-between px-4 py-3.5'>
            <span className='text-[17px] font-bold'>{SITE_NAME}</span>
            <button type='button' onClick={close} aria-label='Close menu' className='flex size-9 cursor-pointer items-center justify-center rounded-lg text-n-600 hover:bg-n-50'>
              <X className='size-5' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto overscroll-contain'>
            {/* Who's signed in */}
            <div className='px-4 pb-4'>
              {signedIn ? (
                <Link href='/account' onClick={close} className='flex items-center gap-3 rounded-xl bg-n-50 p-3'>
                  <span className='flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-700'>{initials(user.fullName)}</span>
                  <span className='min-w-0 flex-1'>
                    <span className='block truncate text-sm font-bold'>{user.fullName}</span>
                    <span className='block text-xs text-brand-700'>View my account</span>
                  </span>
                  <ChevronRight className='size-4 text-n-400' />
                </Link>
              ) : status === 'loading' ? (
                <div className='h-[68px] animate-pulse rounded-xl bg-n-50' />
              ) : (
                <div className='flex gap-2'>
                  <Link href='/login' onClick={close} className='btn-primary flex-1 py-2.5 text-[13px]'>Log in</Link>
                  <Link href='/signup' onClick={close} className='btn-outline flex-1 py-2.5 text-[13px]'>Sign up</Link>
                </div>
              )}
            </div>

            <Section title='Shop'>
              <Row href='/' Icon={Home} label='Home' onClick={close} />
              <Row href='/categories' Icon={LayoutGrid} label='All categories' onClick={close} />
              {categories === null ? (
                [0, 1, 2].map((i) => <div key={i} className='mx-3 my-2 h-6 animate-pulse rounded bg-n-50' />)
              ) : categories.map((c) => (
                <Link key={c.id} href={`/category/${c.slug}`} onClick={close} className='flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium hover:bg-n-50'>
                  <span className='flex size-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700'><CategoryIcon name={`${c.name} ${c.slug}`} className='size-3.5' /></span>
                  <span className='flex-1'>{c.name}</span>
                  <span className='text-[11px] text-n-600'>{c.productsCount}</span>
                </Link>
              ))}
            </Section>

            <Section title='My stuff'>
              <Row href='/wishlist' Icon={Heart} label='Wishlist' badge={wishCount} onClick={close} />
              <Row href='/cart' Icon={ShoppingCart} label='Cart' badge={cartCount} onClick={close} />
              {signedIn && (
                <>
                  <Row href='/account' Icon={UserRound} label='Profile' onClick={close} />
                  <Row href='/account/addresses' Icon={MapPin} label='Saved addresses' onClick={close} />
                  <Row href='/account/notifications' Icon={Bell} label='Notifications' onClick={close} />
                  <Row href='/account/security' Icon={ShieldCheck} label='Login & security' onClick={close} />
                </>
              )}
            </Section>

            <Section title='Help'>
              <Row href='/help' Icon={LifeBuoy} label='Help & chat support' onClick={close} />
              <Row href='/about' Icon={Info} label='About & policies' onClick={close} />
            </Section>

            {signedIn && (
              <div className='border-t border-n-200 px-2 py-3'>
                <button type='button' onClick={async () => { close(); await logout(); router.replace('/') }}
                  className='flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-semibold text-[#B23139] hover:bg-error/5'>
                  <LogOut className='size-[18px]' /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
