import type { Metadata } from 'next'
import CartView from '@/components/cart/CartView'

export const metadata: Metadata = { title: 'My cart' }

export default function CartPage() {
  return <CartView />
}
