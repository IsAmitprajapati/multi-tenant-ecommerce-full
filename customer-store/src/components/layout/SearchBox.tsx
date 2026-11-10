import { Search } from 'lucide-react'

/** Plain GET form → /products?q=… (works without JavaScript) */
export default function SearchBox({ className = '' }: { className?: string }) {
  return (
    <form action='/products' role='search' className={`relative ${className}`}>
      <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-n-400' />
      <input
        name='q'
        type='search'
        placeholder='Search products, brands and stores'
        aria-label='Search products'
        className='w-full rounded-lg border-[1.5px] border-n-200 bg-n-50 py-2.5 pr-3.5 pl-9 text-[13px] outline-none placeholder:text-n-400 focus:border-brand-600 focus:bg-white'
      />
    </form>
  )
}
