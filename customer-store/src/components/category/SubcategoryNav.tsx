'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ArrowLeft, LayoutGrid } from 'lucide-react'
import CategoryIcon from '@/components/home/CategoryIcon'
import type { PublicCategory } from '@/lib/types'

type Sub = PublicCategory['children'][number]

/** activeSlug value for the "All products" entry */
export const ALL = '__all__'

/** Small centred icon: the one uploaded in Platform admin, or the built-in match. (Card images are wide, so they're not cropped into this tiny square.) */
function Thumb({ s, className, tint }: { s: Sub; className: string; tint: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center text-brand-700 ${tint} ${className}`}>
      {s.iconUrl
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={s.iconUrl} alt='' className='size-[55%] object-contain' />
        : <CategoryIcon name={`${s.name} ${s.slug}`} className='size-[50%]' />}
    </span>
  )
}

/** Keeps the selected sub-category visible inside its scrolling list */
function useRevealActive<T extends HTMLElement>(activeSlug: string, block: ScrollLogicalPosition, inline: ScrollLogicalPosition) {
  const ref = useRef<T>(null)
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block, inline, behavior: 'smooth' })
  }, [activeSlug, block, inline])
  return ref
}

/** Desktop: sticky full-height list of the category's sub-categories */
export interface SubNavProps {
  top: PublicCategory
  activeSlug: string
  hrefFor: (slug: string) => string
  onNavigate: (e: React.MouseEvent, href: string) => void
  onPrefetch: (slug: string) => void
}

export function SubcategorySidebar({ top, activeSlug, hrefFor, onNavigate, onPrefetch, children }: SubNavProps & { children?: React.ReactNode }) {
  const ref = useRevealActive<HTMLDivElement>(activeSlug, 'nearest', 'nearest')
  return (
    // The coloured column fills the page height (down to the footer); the panel inside stays in view
    <div className='hidden w-[264px] shrink-0 bg-n-100 lg:block'>
    <aside className='sticky top-[72px] flex h-[calc(100dvh-72px)] flex-col'>
      <div className='border-b border-n-200 px-4 pt-5 pb-3.5'>
        <Link href='/categories' className='inline-flex items-center gap-1.5 text-xs font-semibold text-n-600 hover:text-brand-600'><ArrowLeft className='size-3.5' /> All categories</Link>
        <div className='mt-2 truncate text-[15px] font-bold'>{top.name}</div>
      </div>
      <div ref={ref} className='flex-1 overflow-y-auto'>
      {top.children.length > 0 && <nav className='px-2.5 py-3' aria-label={`${top.name} sub-categories`}>
        <div className='flex flex-col gap-1'>
          <a href={hrefFor(ALL)} onClick={(e) => onNavigate(e, hrefFor(ALL))} onMouseEnter={() => onPrefetch(ALL)} aria-current={activeSlug === ALL ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-[10px] border-l-[3px] px-2.5 py-2 text-[13px] font-semibold transition-colors ${activeSlug === ALL ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-transparent hover:bg-white/70'}`}>
            <span className='flex size-9 shrink-0 items-center justify-center rounded-[9px] bg-brand-600 text-white'><LayoutGrid className='size-4' /></span>
            <span className='min-w-0 flex-1 truncate'>All {top.name}</span>
            <span className='text-[11px] font-medium text-n-600'>{top.productsCount}</span>
          </a>
          {top.children.map((s) => {
            const active = s.slug === activeSlug
            return (
              <a key={s.id} href={hrefFor(s.slug)} onClick={(e) => onNavigate(e, hrefFor(s.slug))} onMouseEnter={() => onPrefetch(s.slug)} onTouchStart={() => onPrefetch(s.slug)} aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-[10px] border-l-[3px] px-2.5 py-2 text-[13px] font-semibold transition-colors ${active ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-transparent hover:bg-white/70'}`}>
                <Thumb s={s} className='size-9 rounded-[9px]' tint={active ? 'bg-white' : 'bg-brand-100'} />
                <span className='min-w-0 flex-1 truncate'>{s.name}</span>
                <span className='text-[11px] font-medium text-n-600'>{s.productsCount}</span>
              </a>
            )
          })}
        </div>
      </nav>}
      {children && <div className='border-t border-n-200 px-4 pt-5 pb-8'>{children}</div>}
      </div>
    </aside>
    </div>
  )
}

/** Phones/tablets: horizontal chips at the top */
export function SubcategoryChips({ top, activeSlug, hrefFor, onNavigate, onPrefetch }: SubNavProps) {
  const ref = useRevealActive<HTMLElement>(activeSlug, 'nearest', 'center')
  return (
    <nav ref={ref} className='no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:hidden' aria-label={`${top.name} sub-categories`}>
      <a href={hrefFor(ALL)} onClick={(e) => onNavigate(e, hrefFor(ALL))} aria-current={activeSlug === ALL ? 'page' : undefined}
        className={`flex shrink-0 items-center rounded-full border-[1.5px] px-3.5 py-1 text-xs font-semibold ${activeSlug === ALL ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white'}`}>
        All
      </a>
      {top.children.map((s) => {
        const active = s.slug === activeSlug
        return (
          <a key={s.id} href={hrefFor(s.slug)} onClick={(e) => onNavigate(e, hrefFor(s.slug))} onTouchStart={() => onPrefetch(s.slug)} aria-current={active ? 'page' : undefined}
            className={`flex shrink-0 items-center gap-2 rounded-full border-[1.5px] py-1 pr-3.5 pl-1 text-xs font-semibold ${active ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white'}`}>
            <Thumb s={s} className='size-7 rounded-full' tint={active ? 'bg-white' : 'bg-brand-100'} />
            {s.name}
          </a>
        )
      })}
    </nav>
  )
}
