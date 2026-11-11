/**
 * Loading placeholder with the exact shape of <ProductCard>: same photo ratio, heart spot,
 * and rows sized to the real line heights (store · title · rating · price) — so nothing jumps when cards load.
 */
export default function ProductCardSkeleton({ className = '' }: { className?: string }) {
  const bar = 'animate-pulse rounded bg-n-100'
  return (
    <div className={`relative flex flex-col overflow-hidden rounded-xl border border-n-200 bg-white ${className}`} aria-hidden>
      <div className='aspect-[19/13] animate-pulse bg-n-100' />
      <span className='absolute top-2 right-2 size-[30px] rounded-full bg-white/80' />
      <div className='flex flex-1 flex-col p-3'>
        <div className='flex h-[15.75px] items-center'><div className={`h-2.5 w-1/2 ${bar}`} /></div>
        <div className='mt-0.5 flex h-[17.875px] items-center'><div className={`h-3 w-4/5 ${bar}`} /></div>
        <div className='mt-1 flex h-[18px] items-center gap-1.5'><div className={`h-[16px] w-10 ${bar}`} /><div className={`h-2.5 w-6 ${bar}`} /></div>
        <div className='mt-auto flex h-[26px] items-end gap-1.5 pt-1.5'><div className={`h-4 w-14 ${bar}`} /><div className={`h-3 w-10 ${bar}`} /></div>
      </div>
    </div>
  )
}
