import type { Metadata } from 'next'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import StandalonePage from '@/components/layout/StandalonePage'
import { ABOUT, POLICIES } from '@/content/site'

export const metadata: Metadata = { title: 'About & policies' }

export default function AboutPage() {
  return (
    <StandalonePage title='About & policies' crumb='About & policies'>
      <section className='card'>
        <h2 className='text-[15px] font-bold'>{ABOUT.title}</h2>
        <p className='mt-2 text-[13px] leading-relaxed text-n-600'>{ABOUT.text}</p>
      </section>
      <nav className='card py-1 sm:py-1' aria-label='Policies'>
        {POLICIES.map((p) => (
          // Opens in a new browser tab so the shopper keeps their place
          <Link key={p.slug} href={`/policies/${p.slug}`} target='_blank' rel='noopener'
            className='flex items-center justify-between border-b border-n-200 py-3.5 text-[13px] font-semibold last:border-0 hover:text-brand-700'>
            <span>{p.title}<span className='sr-only'> (opens in a new tab)</span></span>
            <ExternalLink className='size-4 text-n-400' aria-hidden />
          </Link>
        ))}
      </nav>
    </StandalonePage>
  )
}
