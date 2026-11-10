import { Headset, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { SITE_NAME } from '@/lib/config'

const TRUST = [
  { Icon: Truck, label: 'Free delivery over ₹499' },
  { Icon: RotateCcw, label: 'Easy 7-day returns' },
  { Icon: ShieldCheck, label: 'Secure payments' },
  { Icon: Headset, label: '24/7 customer support' },
]

export default function SiteFooter({ year }: { year: number }) {
  return (
    <footer className='mt-auto'>
      <div className='mx-auto max-w-[1440px] px-4 sm:px-8'>
        <div className='grid grid-cols-2 gap-4 border-t border-n-200 py-8 lg:grid-cols-4'>
          {TRUST.map(({ Icon, label }) => (
            <div key={label} className='flex items-center gap-2.5'>
              <Icon className='size-5 shrink-0 text-brand-600' />
              <span className='text-xs font-semibold text-n-600'>{label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className='border-t border-n-200 bg-white'>
        <div className='mx-auto flex max-w-[1440px] flex-col gap-3 px-4 py-6 text-xs text-n-600 sm:flex-row sm:items-center sm:justify-between sm:px-8'>
          <span>© {year} Platform, Inc. · {SITE_NAME}</span>
          <nav className='flex gap-5' aria-label='Footer'>
            <span>About</span><span>Help</span><span>Policies</span><span>Contact</span>
          </nav>
        </div>
      </div>
    </footer>
  )
}
