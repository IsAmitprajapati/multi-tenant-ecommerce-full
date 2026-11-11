'use client'

import { useState } from 'react'
import { Check, Star } from 'lucide-react'
import { inr } from '@/lib/format'
import { DISCOUNT_OPTIONS, RATING_OPTIONS, type ListingFilters } from '@/lib/listing'
import type { ListingFacets } from '@/lib/types'

function Group({ title, children, last }: { title: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-5 border-b border-n-200 pb-5'}>
      <div className='mb-2.5 text-xs font-bold'>{title}</div>
      {children}
    </div>
  )
}

function CheckOption({ checked, label, count, onToggle }: { checked: boolean; label: string; count?: number; onToggle: () => void }) {
  return (
    <button type='button' role='checkbox' aria-checked={checked} onClick={onToggle}
      className='flex w-full cursor-pointer items-center gap-2.5 py-1.5 text-left text-[13px]'>
      <span className={`flex size-4 shrink-0 items-center justify-center rounded-[5px] border-[1.5px] ${checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-n-200 bg-white'}`}>
        {checked && <Check className='size-3' strokeWidth={3} />}
      </span>
      <span className='min-w-0 flex-1 truncate'>{label}</span>
      {count != null && <span className='text-[11px] text-n-600'>{count}</span>}
    </button>
  )
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type='button' role='switch' aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors ${on ? 'bg-brand-600' : 'bg-n-200'}`}>
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] ${on ? 'left-[18px]' : 'left-0.5'}`} />
    </button>
  )
}

/** Two-handle price range + boxes; applies when a handle is released, Enter is pressed or a box loses focus */
function PriceRange({ bounds, min, max, onApply }: { bounds: { min: number; max: number }; min?: number; max?: number; onApply: (min?: number, max?: number) => void }) {
  const clamp = (v: number) => Math.min(bounds.max, Math.max(bounds.min, v))
  const lo0 = clamp(min ?? bounds.min)
  const hi0 = clamp(max ?? bounds.max)
  // Draft while dragging/typing; resets when the applied values or bounds change
  const key = `${bounds.min}-${bounds.max}-${min}-${max}`
  const [draft, setDraft] = useState({ key: '', lo: lo0, hi: hi0, loText: String(lo0), hiText: String(hi0) })
  const d = draft.key === key ? draft : { key, lo: lo0, hi: hi0, loText: String(lo0), hiText: String(hi0) }
  const span = Math.max(1, bounds.max - bounds.min)
  const step = span > 20000 ? 500 : span > 2000 ? 50 : span > 200 ? 10 : 1

  const apply = (lo: number, hi: number) => {
    const l = clamp(Math.min(lo, hi)), h = clamp(Math.max(lo, hi))
    setDraft({ key, lo: l, hi: h, loText: String(l), hiText: String(h) })
    onApply(l <= bounds.min ? undefined : l, h >= bounds.max ? undefined : h)
  }
  const fromText = () => apply(Number(d.loText) || bounds.min, Number(d.hiText) || bounds.max)

  if (bounds.max <= bounds.min) return <p className='text-xs text-n-600'>{bounds.max ? `All items cost ${inr(bounds.max)}` : 'No prices yet'}</p>

  const thumb = 'pointer-events-none absolute inset-x-0 top-1/2 h-5 w-full -translate-y-1/2 appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-brand-600 [&::-moz-range-thumb]:bg-white [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-brand-600 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow'
  const slide = (lo: number, hi: number) => setDraft({ key, lo, hi, loText: String(lo), hiText: String(hi) })
  const box = (label: 'Min' | 'Max', text: string, setText: (t: string) => void) => (
    <label className='relative flex-1'>
      <span className='pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-xs text-n-600'>₹</span>
      <input inputMode='numeric' aria-label={`${label} price`} value={text}
        onChange={(e) => setText(e.target.value.replace(/\D/g, '').slice(0, 9))}
        onBlur={fromText} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fromText() } }}
        className='w-full rounded-lg border-[1.5px] border-n-200 bg-white py-1.5 pr-2 pl-5 text-xs outline-none focus:border-brand-600' />
    </label>
  )
  return (
    <div className='px-1.5'>
      <div className='relative h-5'>
        <div className='absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-n-200' />
        <div className='absolute top-1/2 h-[5px] -translate-y-1/2 rounded-full bg-brand-600'
          style={{ left: `${((d.lo - bounds.min) / span) * 100}%`, right: `${100 - ((d.hi - bounds.min) / span) * 100}%` }} />
        <input type='range' aria-label='Minimum price' className={thumb} min={bounds.min} max={bounds.max} step={step} value={d.lo}
          onChange={(e) => slide(Math.min(Number(e.target.value), d.hi), d.hi)} onPointerUp={() => apply(d.lo, d.hi)} onKeyUp={() => apply(d.lo, d.hi)} />
        <input type='range' aria-label='Maximum price' className={thumb} min={bounds.min} max={bounds.max} step={step} value={d.hi}
          onChange={(e) => slide(d.lo, Math.max(Number(e.target.value), d.lo))} onPointerUp={() => apply(d.lo, d.hi)} onKeyUp={() => apply(d.lo, d.hi)} />
      </div>
      <div className='-mx-1.5 mt-2.5 flex items-center gap-2'>
        {box('Min', d.loText, (t) => setDraft({ ...d, loText: t }))}
        <span className='text-xs text-n-400'>–</span>
        {box('Max', d.hiText, (t) => setDraft({ ...d, hiText: t }))}
      </div>
    </div>
  )
}

export default function FilterPanel({ facets, filters, onChange }: {
  facets: ListingFacets | null
  filters: ListingFilters
  onChange: (next: ListingFilters) => void
}) {
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const sellers = facets?.sellers ?? []
  const brands = facets?.brands ?? []
  // Keep chosen options visible even if this sub-category has none of them
  const extraSellers = filters.sellers.filter((s) => !sellers.some((x) => x.slug === s)).map((slug) => ({ slug, name: slug.replace(/^demo-/, '').replace(/-/g, ' '), count: 0 }))
  const extraBrands = filters.brands.filter((b) => !brands.some((x) => x.name === b)).map((name) => ({ name, count: 0 }))

  return (
    <div>
      <Group title='Price range'>
        {facets ? <PriceRange bounds={facets.price} min={filters.minPrice} max={filters.maxPrice} onApply={(minPrice, maxPrice) => onChange({ ...filters, minPrice, maxPrice })} />
          : <div className='h-12 animate-pulse rounded bg-n-200/60' />}
      </Group>

      <Group title='Seller'>
        {[...sellers, ...extraSellers].length === 0 ? <p className='text-xs text-n-600'>No sellers yet</p>
          : [...sellers, ...extraSellers].map((s) => (
            <CheckOption key={s.slug} label={s.name} count={s.count} checked={filters.sellers.includes(s.slug)} onToggle={() => onChange({ ...filters, sellers: toggle(filters.sellers, s.slug) })} />
          ))}
      </Group>

      <Group title='Brand'>
        {[...brands, ...extraBrands].length === 0 ? <p className='text-xs text-n-600'>No brands listed here yet</p>
          : [...brands, ...extraBrands].map((b) => (
            <CheckOption key={b.name} label={b.name} count={b.count} checked={filters.brands.includes(b.name)} onToggle={() => onChange({ ...filters, brands: toggle(filters.brands, b.name) })} />
          ))}
      </Group>

      <Group title='Customer rating'>
        <div role='radiogroup' aria-label='Customer rating' aria-disabled={!facets?.ratingsAvailable || undefined} className={facets?.ratingsAvailable ? '' : 'opacity-50'}>
          {RATING_OPTIONS.map((r) => {
            const on = filters.rating === r
            return (
              <button key={r} type='button' role='radio' aria-checked={on} disabled={!facets?.ratingsAvailable}
                onClick={() => onChange({ ...filters, rating: on ? undefined : r })}
                className='flex w-full cursor-pointer items-center gap-2.5 py-1.5 text-left text-[13px] disabled:cursor-default'>
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-[1.5px] ${on ? 'border-brand-600' : 'border-n-200 bg-white'}`}>
                  {on && <span className='size-2 rounded-full bg-brand-600' />}
                </span>
                <span className='inline-flex items-center gap-1'>{r}<Star className='size-3 fill-current text-warning' /> &amp; up</span>
              </button>
            )
          })}
        </div>
        {!facets?.ratingsAvailable && <p className='mt-1 text-[11px] text-n-600'>No products here have been rated yet.</p>}
      </Group>

      <Group title='Discount'>
        <div className='flex flex-wrap gap-2'>
          {DISCOUNT_OPTIONS.map((d) => {
            const on = filters.discount === d
            return (
              <button key={d} type='button' aria-pressed={on} onClick={() => onChange({ ...filters, discount: on ? undefined : d })}
                className={`cursor-pointer rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${on ? 'border-brand-600 bg-brand-100 text-[#155C3B]' : 'border-n-200 bg-white hover:border-brand-600'}`}>
                {d}% or more
              </button>
            )
          })}
        </div>
      </Group>

      <Group title={<span className='flex items-center justify-between'>In stock only<Toggle label='In stock only' on={filters.inStock} onChange={(v) => onChange({ ...filters, inStock: v })} /></span>} last>
        <p className='text-[11px] text-n-600'>Hide items that are sold out.</p>
      </Group>
    </div>
  )
}
