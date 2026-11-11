'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { addRecentSearch } from '@/lib/recent-searches'
import { SEARCH_DEBOUNCE_MS, searchHref } from '@/lib/search'

const PLACEHOLDER = 'Search for grocery, fashion, home & more'
const SET_EVENT = 'marketplace:set-search'

/** Lets the search page put a term in the header box (trending / recent picks) */
export function setSearchQuery(q: string) {
  window.history.replaceState(null, '', searchHref(q))
  window.dispatchEvent(new CustomEvent(SET_EVENT, { detail: q }))
}

/**
 * Header search. The box keeps its own text (so fast typing is never overwritten).
 * On /search the address bar (?q=, which drives the results) is updated only after a
 * short pause in typing — debounced, so the page searches once per pause, not per keystroke.
 * Elsewhere, focusing the box or pressing Enter opens the search page.
 */
export default function SearchBox({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const router = useRouter()
  const onSearchPage = pathname === '/search'
  const [text, setText] = useState(() => (onSearchPage ? params.get('q') ?? '' : ''))
  const timer = useRef<number | undefined>(undefined)

  /** Debounced: write ?q= after the user pauses typing (or right away with now=true) */
  const syncUrl = (v: string, now = false) => {
    window.clearTimeout(timer.current)
    if (now) window.history.replaceState(null, '', searchHref(v))
    else timer.current = window.setTimeout(() => window.history.replaceState(null, '', searchHref(v)), SEARCH_DEBOUNCE_MS)
  }
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Picks from the search page, and back/forward between searches
  useEffect(() => {
    // A pick wins over any typing still waiting to be written
    const onSet = (e: Event) => { window.clearTimeout(timer.current); setText((e as CustomEvent<string>).detail) }
    const onPop = () => setText(location.pathname === '/search' ? new URLSearchParams(location.search).get('q') ?? '' : '')
    window.addEventListener(SET_EVENT, onSet)
    window.addEventListener('popstate', onPop)
    return () => { window.removeEventListener(SET_EVENT, onSet); window.removeEventListener('popstate', onPop) }
  }, [])

  // Leaving the search page (e.g. opening a product) empties the box
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    if (!onSearchPage) setText('')
  }

  const change = (v: string, now = false) => {
    setText(v)
    if (onSearchPage) syncUrl(v, now)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = text.trim()
    if (q) addRecentSearch(q)
    if (onSearchPage) { syncUrl(text, true); (document.activeElement as HTMLElement | null)?.blur(); return }
    router.push(searchHref(q))
  }

  const openSearch = () => {
    if (onSearchPage) return
    router.push(searchHref(text.trim()))
  }

  return (
    <form action='/search' role='search' onSubmit={submit} className={`relative ${className}`}>
      <Search className={`pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 ${onSearchPage ? 'text-brand-600' : 'text-n-400'}`} />
      <input
        name='q'
        type='search'
        value={text}
        onChange={(e) => change(e.target.value)}
        onFocus={openSearch}
        placeholder={PLACEHOLDER}
        aria-label='Search products'
        autoComplete='off'
        enterKeyHint='search'
        className={`w-full rounded-lg border-[1.5px] py-2.5 pr-9 pl-9 text-[13px] outline-none placeholder:text-n-400 [&::-webkit-search-cancel-button]:hidden ${onSearchPage ? 'border-brand-600 bg-white' : 'border-n-200 bg-n-50 focus:border-brand-600 focus:bg-white'}`}
      />
      {text && (
        <button type='button' onClick={() => change('', true)} aria-label='Clear search'
          className='absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-n-600 hover:bg-n-100'>
          <X className='size-3.5' />
        </button>
      )}
    </form>
  )
}

/** Shown while the header hydrates (search params are read on the client) */
export function SearchBoxFallback({ className = '' }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-n-400' />
      <div className='w-full rounded-lg border-[1.5px] border-n-200 bg-n-50 py-2.5 pl-9 text-[13px] text-n-400'>{PLACEHOLDER}</div>
    </div>
  )
}
