import ProductCard from './ProductCard'
import type { ProductCard as Card } from '@/lib/types'

/**
 * One card size everywhere (same as the wishlist grid): 2 per row on phones, 3 tablet, 4 laptop, 5 desktop.
 * Pages with a left sidebar use one column fewer so each card ends up the same size.
 */
export const GRID_COLS = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
export const GRID_COLS_WITH_SIDEBAR = 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
export const GRID_GAP = 'gap-3 sm:gap-4'

/** Horizontal, swipeable row — each card is exactly one grid column wide, so it matches grid cards */
const RAIL_CARD = 'w-[calc((100%-0.75rem)/2)] sm:w-[calc((100%-2rem)/3)] lg:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-4rem)/5)]'

export default function ProductRail({ products }: { products: Card[] }) {
  return (
    <div className='no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0'>
      {products.map((p) => <ProductCard key={p.id} p={p} className={`shrink-0 snap-start ${RAIL_CARD}`} />)}
    </div>
  )
}

export function ProductGrid({ products, withSidebar = false }: { products: Card[]; withSidebar?: boolean }) {
  return (
    <div className={`grid ${GRID_GAP} ${withSidebar ? GRID_COLS_WITH_SIDEBAR : GRID_COLS}`}>
      {products.map((p) => <ProductCard key={p.id} p={p} />)}
    </div>
  )
}
