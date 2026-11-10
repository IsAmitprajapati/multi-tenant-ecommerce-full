import Link from 'next/link'
import { ShoppingBasket } from 'lucide-react'
import { SITE_NAME } from '@/lib/config'

export default function Logo({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <Link href='/' className='flex shrink-0 items-center gap-2.5' aria-label={`${SITE_NAME} home`}>
      <span className={`flex size-[34px] items-center justify-center rounded-[9px] ${tone === 'light' ? 'bg-lime-500 text-brand-900' : 'bg-brand-600 text-white'}`}>
        <ShoppingBasket className='size-[18px]' strokeWidth={2.2} />
      </span>
      <span className={`text-[17px] font-bold ${tone === 'light' ? 'text-white' : 'text-n-900'}`}>{SITE_NAME}</span>
    </Link>
  )
}
