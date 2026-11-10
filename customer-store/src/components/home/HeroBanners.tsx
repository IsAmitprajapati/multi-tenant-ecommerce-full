'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { safeHref } from '@/lib/format'
import type { HomeData } from '@/lib/types'

function Slide({ b, priority, padForArrows = false }: { b: HomeData['banners']['items'][number]; priority: boolean; padForArrows?: boolean }) {
  const href = safeHref(b.linkUrl)
  const external = href?.startsWith('http')
  // Same shape as the uploaded artwork (1600 × 500 → 16:5) so nothing is cropped; phones get a taller crop anchored right
  const body = (
    <div className='relative flex aspect-[4/3] items-center overflow-hidden rounded-[20px] bg-gradient-to-r from-brand-900 to-brand-700 min-[480px]:aspect-[16/7] md:aspect-[16/5]'>
      <Image src={b.imageUrl} alt='' fill priority={priority} sizes='(min-width: 1440px) 1360px, 100vw' className='object-cover object-right md:object-center' />
      {/* Keeps the text readable on any image */}
      <div className='absolute inset-0 bg-gradient-to-r from-brand-900/85 via-brand-900/45 to-transparent max-md:via-brand-900/60' />
      <div className={`relative max-w-[460px] py-6 lg:py-10 ${padForArrows ? 'pr-6 pl-6 sm:pl-16 lg:pr-12 lg:pl-20' : 'px-6 lg:px-12'}`}>
        <h2 className='text-[22px] leading-tight font-bold text-white sm:text-[26px] lg:text-[34px]'>{b.title}</h2>
        {b.subtitle && <p className='mt-2 line-clamp-2 text-[13px] text-[#C7DCCB] sm:text-sm lg:mt-2.5'>{b.subtitle}</p>}
        {b.ctaLabel && href && <span className='btn-lime mt-4 px-5 py-2.5 text-[13px] lg:mt-5 lg:px-6 lg:py-3 lg:text-sm'>{b.ctaLabel}</span>}
      </div>
    </div>
  )
  if (!href) return body
  return external
    ? <a href={href} target='_blank' rel='noopener noreferrer' aria-label={b.title}>{body}</a>
    : <Link href={href} aria-label={b.title}>{body}</Link>
}

/** Admin-managed hero: carousel (auto-advances, pauses on hover/focus) or a single banner */
export default function HeroBanners({ banners }: { banners: HomeData['banners'] }) {
  const items = banners.mode === 'SINGLE' ? banners.items.slice(0, 1) : banners.items
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = items.length

  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count])

  useEffect(() => {
    if (count < 2 || paused) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const t = setInterval(() => go(1), Math.max(2, banners.autoplaySeconds) * 1000)
    return () => clearInterval(t)
  }, [count, paused, go, banners.autoplaySeconds])

  if (count === 0) return null
  if (count === 1) return <Slide b={items[0]!} priority />

  return (
    <section
      aria-roledescription='carousel'
      aria-label='Featured offers'
      className='group relative'
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0]!.clientX }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0]!.clientX - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
    >
      <div className='overflow-hidden rounded-[20px]'>
        <div className='flex transition-transform duration-500 ease-out motion-reduce:transition-none' style={{ transform: `translateX(-${index * 100}%)` }}>
          {items.map((b, i) => (
            <div key={b.id} className='w-full shrink-0' aria-roledescription='slide' aria-label={`${i + 1} of ${count}`} aria-hidden={i !== index} inert={i !== index}>
              <Slide b={b} priority={i === 0} padForArrows />
            </div>
          ))}
        </div>
      </div>
      <button type='button' onClick={() => go(-1)} aria-label='Previous banner'
        className='absolute top-1/2 left-3 hidden size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-n-900 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 sm:flex sm:left-4 sm:size-10'>
        <ChevronLeft className='size-5' />
      </button>
      <button type='button' onClick={() => go(1)} aria-label='Next banner'
        className='absolute top-1/2 right-3 hidden size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white/90 text-n-900 opacity-0 shadow-md transition-opacity duration-200 group-hover:opacity-100 hover:bg-white focus-visible:opacity-100 sm:flex sm:right-4 sm:size-10'>
        <ChevronRight className='size-5' />
      </button>
      <div className='absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5'>
        {items.map((b, i) => (
          <button key={b.id} type='button' onClick={() => setIndex(i)} aria-label={`Show banner ${i + 1}`} aria-current={i === index}
            className={`h-1.5 cursor-pointer rounded-full transition-all ${i === index ? 'w-6 bg-lime-500' : 'w-1.5 bg-white/60 hover:bg-white'}`} />
        ))}
      </div>
    </section>
  )
}
