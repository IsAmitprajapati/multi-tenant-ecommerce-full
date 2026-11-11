import { GRID_COLS, GRID_COLS_WITH_SIDEBAR, GRID_GAP } from './ProductRail'

export default function ListingSkeleton({ withSidebar = false }: { withSidebar?: boolean }) {
  return (
    <div className={`grid ${GRID_GAP} ${withSidebar ? GRID_COLS_WITH_SIDEBAR : GRID_COLS}`} aria-busy='true' aria-label='Loading products'>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className='overflow-hidden rounded-xl border border-n-200 bg-white'>
          <div className='aspect-[19/13] animate-pulse bg-n-100' />
          <div className='space-y-2 p-3'>
            <div className='h-2.5 w-1/2 animate-pulse rounded bg-n-100' />
            <div className='h-3 w-4/5 animate-pulse rounded bg-n-100' />
            <div className='h-3.5 w-1/3 animate-pulse rounded bg-n-100' />
          </div>
        </div>
      ))}
    </div>
  )
}
