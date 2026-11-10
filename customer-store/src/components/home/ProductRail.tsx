import ProductCard from './ProductCard'
import type { ProductCard as Card } from '@/lib/types'

/** Horizontal, swipeable row of products */
export default function ProductRail({ products }: { products: Card[] }) {
  return (
    <div className='no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0'>
      {products.map((p) => <ProductCard key={p.id} p={p} className='w-[46vw] max-w-[200px] shrink-0 snap-start sm:w-[190px]' />)}
    </div>
  )
}

export function ProductGrid({ products }: { products: Card[] }) {
  return (
    <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5'>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  )
}
