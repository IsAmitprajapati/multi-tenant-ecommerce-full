import type { Metadata } from 'next'
import { TicketPercent } from 'lucide-react'
import AccountPage from '@/components/account/AccountPage'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export const metadata: Metadata = { title: 'Wallet & coupons' }

/** Wallet & coupons (design). No wallet credits or coupons exist on the platform yet — shown honestly as empty. */
export default function WalletPage() {
  return (
    <AccountPage title='Wallet & coupons' description='Refunds, cashback and coupons in one place.'>
      <section className='rounded-card bg-gradient-to-r from-brand-900 to-brand-700 p-5 sm:p-6'>
        <div className='text-xs text-[#C7DCCB]'>Wallet balance</div>
        <div className='mt-1.5 text-[28px] font-bold text-white'>₹0.00</div>
        <p className='mt-2 text-xs text-[#C7DCCB]'>Refunds you choose to keep as credit and cashback will appear here, ready to use at checkout.</p>
      </section>
      <section className='card'>
        <h2 className='text-[15px] font-bold'>Available coupons</h2>
        <div className='mt-4 flex flex-col items-center py-6 text-center'>
          <TicketPercent className='size-9 text-n-400' />
          <p className='mt-3 text-sm font-semibold'>No coupons right now</p>
          <p className='mt-1 text-[13px] text-n-600'>When stores run offers you can use, they’ll show up here.</p>
        </div>
      </section>
    </AccountPage>
  )
}
