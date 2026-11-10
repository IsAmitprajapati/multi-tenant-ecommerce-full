'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ImageOff } from 'lucide-react'

export default function ProductGallery({ images, title }: { images: { id: string; url: string }[]; title: string }) {
  const [active, setActive] = useState(0)
  const current = images[active] ?? images[0]

  return (
    <div>
      <div className='relative aspect-[4/3] overflow-hidden rounded-2xl border border-n-200 bg-white sm:aspect-[16/11]'>
        {current
          ? <Image key={current.id} src={current.url} alt={title} fill priority sizes='(min-width: 1024px) 760px, 100vw' className='object-cover' />
          : <span className='flex size-full items-center justify-center text-n-400'><ImageOff className='size-10' /></span>}
      </div>
      {images.length > 1 && (
        <div className='no-scrollbar mt-3 flex gap-2.5 overflow-x-auto' role='tablist' aria-label='Product images'>
          {images.map((img, i) => (
            <button key={img.id} type='button' role='tab' aria-selected={i === active} aria-label={`Image ${i + 1} of ${images.length}`}
              onClick={() => setActive(i)}
              className={`relative size-16 shrink-0 cursor-pointer overflow-hidden rounded-lg border-2 ${i === active ? 'border-brand-600' : 'border-transparent hover:border-n-200'}`}>
              <Image src={img.url} alt='' fill sizes='64px' className='object-cover' />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
