'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

/** Read-only stars with partial fill (e.g. 4.4) */
export function Stars({ value, size = 'size-4', className = '' }: { value: number; size?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} role='img' aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)))
        return (
          <span key={i} className={`relative inline-block ${size}`}>
            <Star className={`absolute inset-0 ${size} text-n-200`} fill='currentColor' strokeWidth={0} />
            {fill > 0 && (
              <span className='absolute inset-0 overflow-hidden' style={{ width: `${fill * 100}%` }}>
                <Star className={`${size} text-warning`} fill='currentColor' strokeWidth={0} />
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

/** 1–5 star input (radio group; arrow keys work) */
export function StarPicker({ value, onChange, invalid }: { value: number; onChange: (v: number) => void; invalid?: boolean }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className='flex items-center gap-3'>
      <div role='radiogroup' aria-label='Your rating' aria-invalid={invalid || undefined} className='flex' onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type='button' role='radio' aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''} — ${LABELS[i]}`}
            tabIndex={value === i || (!value && i === 1) ? 0 : -1}
            onMouseEnter={() => setHover(i)} onClick={() => onChange(i)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); onChange(Math.min(5, (value || 0) + 1)) }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); onChange(Math.max(1, (value || 2) - 1)) }
            }}
            className='cursor-pointer p-0.5'>
            <Star className={`size-7 transition-colors ${i <= shown ? 'text-warning' : invalid ? 'text-error/40' : 'text-n-200'}`} fill='currentColor' strokeWidth={0} />
          </button>
        ))}
      </div>
      <span className='text-[13px] font-semibold text-n-600'>{shown ? LABELS[shown] : 'Tap a star to rate'}</span>
    </div>
  )
}

/** Small "4.4 ★" chip used on cards and the buy box (design) */
export function RatingChip({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-[5px] bg-brand-100 px-1.5 py-px text-[11px] font-bold text-[#155C3B] ${className}`}>
      {value.toFixed(1)} <Star className='size-2.5' fill='currentColor' strokeWidth={0} />
    </span>
  )
}
