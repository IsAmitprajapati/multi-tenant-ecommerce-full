'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

export interface SelectOption { value: string; label: string }

/**
 * Styled dropdown that matches the site's fields (replaces the browser's native <select> list).
 * Optional search box for long lists; keyboard: ↑ ↓ to move, Enter to pick, Esc to close.
 */
export default function SelectMenu({ id, value, onChange, options, placeholder = 'Select', searchable = false, searchPlaceholder = 'Search…', invalid, ariaLabel, size = 'md' }: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  invalid?: boolean
  ariaLabel?: string
  /** md = form field (full width) · sm = compact control, e.g. "Sort by" (menu opens to the right edge) */
  size?: 'md' | 'sm'
}) {
  const autoId = useId()
  const listId = `${id ?? autoId}-list`
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options
  }, [options, query])
  const selected = options.find((o) => o.value === value)

  const openMenu = () => {
    setQuery('')
    setActive(Math.max(0, options.findIndex((o) => o.value === value)))
    setOpen(true)
  }
  const close = (refocus = true) => { setOpen(false); if (refocus) button.current?.focus() }
  const pick = (o: SelectOption) => { onChange(o.value); close() }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const on = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', on)
    return () => document.removeEventListener('mousedown', on)
  }, [open])

  // Focus search (or the list) when opened, and keep the active option in view
  useEffect(() => {
    if (!open) return
    if (searchable) search.current?.focus()
    else list.current?.focus()
  }, [open, searchable])
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) { e.preventDefault(); openMenu() }
      return
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(filtered.length - 1, i + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); const o = filtered[active]; if (o) pick(o) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') close(false)
  }

  return (
    <div ref={root} className={`relative ${size === 'sm' ? 'inline-block' : ''}`} onKeyDown={onKeyDown}>
      <button ref={button} id={id} type='button' role='combobox' aria-haspopup='listbox' aria-expanded={open} aria-controls={listId}
        aria-label={ariaLabel} aria-invalid={invalid || undefined} onClick={() => (open ? close() : openMenu())}
        className={`${size === 'sm'
          ? 'flex items-center gap-1.5 rounded-lg border-[1.5px] border-n-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-n-900 outline-none focus-visible:border-brand-600'
          : 'field flex items-center justify-between gap-2'} cursor-pointer text-left ${open ? 'border-brand-600 ring-3 ring-brand-600/15' : ''}`}>
        <span className={`truncate ${selected ? '' : 'text-n-400'}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown className={`size-4 shrink-0 text-n-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute top-[calc(100%+6px)] z-40 overflow-hidden rounded-xl border border-n-200 bg-white shadow-[0_12px_32px_-12px_rgba(12,31,22,.35)] ${size === 'sm' ? 'right-0 min-w-[190px]' : 'right-0 left-0'}`}>
          {searchable && (
            <div className='relative border-b border-n-200 p-2'>
              <Search className='pointer-events-none absolute top-1/2 left-4.5 size-4 -translate-y-1/2 text-n-400' />
              <input ref={search} value={query} onChange={(e) => { setQuery(e.target.value); setActive(0) }} placeholder={searchPlaceholder}
                aria-label={searchPlaceholder} aria-controls={listId} aria-activedescendant={filtered[active] ? `${listId}-${active}` : undefined}
                className='w-full rounded-lg bg-n-50 py-2 pr-3 pl-8 text-[13px] outline-none placeholder:text-n-400 focus:bg-white focus:ring-2 focus:ring-brand-600/20' />
            </div>
          )}
          <ul ref={list} id={listId} role='listbox' tabIndex={-1} aria-label={ariaLabel ?? placeholder}
            aria-activedescendant={!searchable && filtered[active] ? `${listId}-${active}` : undefined}
            className='max-h-64 overflow-y-auto overscroll-contain p-1.5 outline-none'>
            {filtered.length === 0 && <li className='px-3 py-6 text-center text-[13px] text-n-600'>No matches</li>}
            {filtered.map((o, i) => {
              const isSel = o.value === value
              return (
                <li key={o.value} id={`${listId}-${i}`} data-index={i} role='option' aria-selected={isSel}
                  onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(o)}
                  className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] ${i === active ? 'bg-n-50' : ''} ${isSel ? 'font-semibold text-[#155C3B]' : 'text-n-900'}`}>
                  <span className='truncate'>{o.label}</span>
                  {isSel && <Check className='size-4 shrink-0 text-brand-600' />}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
