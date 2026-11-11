import { Headset, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { SITE_NAME } from '@/lib/config'

const TRUST = [
  { Icon: Truck, label: 'Free delivery over ₹499' },
  { Icon: RotateCcw, label: 'Easy 7-day returns' },
  { Icon: ShieldCheck, label: 'Secure payments' },
  { Icon: Headset, label: '24/7 customer support' },
]

/** Delivery / returns / payments / support row */
export function TrustStrip({ className = '' }: { className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-4 border-t border-n-200 py-8 lg:grid-cols-4 ${className}`}>
      {TRUST.map(({ Icon, label }) => (
        <div key={label} className='flex items-center gap-2.5'>
          <Icon className='size-5 shrink-0 text-brand-600' />
          <span className='text-xs font-semibold text-n-600'>{label}</span>
        </div>
      ))}
    </div>
  )
}

const YEAR = 2026

function FooterLinks() {
  return (
    <>
      <span>© {YEAR} Platform, Inc. · {SITE_NAME}</span>
      <nav className='flex gap-5' aria-label='Footer'>
        <span>About</span><span>Help</span><span>Policies</span><span>Contact</span>
      </nav>
    </>
  )
}

/**
 * Site-wide footer. Pages with a left sidebar (category pages) put `data-sidebar-layout` on their
 * wrapper and render <ContentFooter /> in their product column instead, so the sidebar runs the
 * full height of the page — this one hides itself on those pages.
 */
export default function SiteFooter() {
  return (
    <footer className='mt-auto [body:has([data-sidebar-layout])_&]:hidden'>
      <div className='mx-auto max-w-[1440px] px-4 sm:px-8'>
        <TrustStrip />
      </div>
      <div className='border-t border-n-200 bg-white'>
        <div className='mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-6 text-xs text-n-600 sm:flex-row sm:items-center sm:justify-between sm:px-8'>
          <FooterLinks />
        </div>
      </div>
    </footer>
  )
}

/** The footer inside a sidebar page's product column (bleeds to the column edges, which use px-4 / sm:px-8 / lg:px-10) */
export function ContentFooter() {
  return (
    <footer className='mt-auto pt-12'>
      <TrustStrip />
      <div className='-mx-4 border-t border-n-200 bg-white px-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10'>
        <div className='flex flex-col gap-3 py-6 text-xs text-n-600 sm:flex-row sm:items-center sm:justify-between'>
          <FooterLinks />
        </div>
      </div>
    </footer>
  )
}
