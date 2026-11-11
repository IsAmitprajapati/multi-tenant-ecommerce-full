import ProductCardSkeleton from './ProductCardSkeleton'
import { GRID_COLS, GRID_COLS_WITH_SIDEBAR, GRID_GAP } from './ProductRail'

/** Grid of card placeholders — same columns and card size as <ProductGrid> */
export default function ListingSkeleton({ withSidebar = false, count = 10, label = 'Loading products' }: { withSidebar?: boolean; count?: number; label?: string }) {
  return (
    <div className={`grid ${GRID_GAP} ${withSidebar ? GRID_COLS_WITH_SIDEBAR : GRID_COLS}`} aria-busy='true' aria-label={label}>
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  )
}
