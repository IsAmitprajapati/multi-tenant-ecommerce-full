import type { Metadata } from 'next'
import { CreditCard, Lock, Plus } from 'lucide-react'
import AccountPage from '@/components/account/AccountPage'

// Rendered after the saved session is read (client-side), so skip instant-navigation validation
export const instant = false

export const metadata: Metadata = { title: 'Payment methods' }

/**
 * Payment methods (design). Cards/UPI can only be saved through the payment gateway at checkout
 * (we never store card numbers), so until checkout exists this shows an empty state.
 */
export default function PaymentsPage() {
  return (
    <AccountPage title='Payment methods' description='Cards and UPI you’ve saved for faster checkout.'>
      <section className='card flex flex-col items-center py-10 text-center'>
        <CreditCard className='size-9 text-n-400' />
        <p className='mt-3 text-sm font-semibold'>No saved payment methods</p>
        <p className='mt-1 max-w-md text-[13px] text-n-600'>You can save a card or UPI ID when you pay at checkout. They’re stored securely by our payment partner — we never keep your full card number.</p>
      </section>
      <button type='button' disabled className='flex items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-dashed border-n-200 bg-white/50 p-3.5 text-[13px] font-semibold text-n-400'>
        <Plus className='size-4' /> Add payment method
      </button>
      <p className='-mt-2 flex items-center justify-center gap-1.5 text-[11px] text-n-600'><Lock className='size-3' /> Payment methods are added securely during checkout.</p>
    </AccountPage>
  )
}
