import Logo from './Logo'
import LocationPicker from './LocationPicker'
import { Suspense } from 'react'
import SearchBox, { SearchBoxFallback } from './SearchBox'
import UserMenu from './UserMenu'
import CartButton from './CartButton'

export default function SiteHeader() {
  return (
    <header className='sticky top-0 z-30 border-b border-n-200 bg-white'>
      <div className='mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:h-[72px] sm:gap-5 sm:px-8'>
        <Logo />
        <div className='hidden md:block'><LocationPicker /></div>
        <Suspense fallback={<SearchBoxFallback className='hidden max-w-[520px] flex-1 md:block' />}>
          <SearchBox className='hidden max-w-[520px] flex-1 md:block' />
        </Suspense>
        <div className='flex-1' />
        <CartButton />
        <UserMenu />
      </div>
      <div className='grid gap-2 px-4 pb-3 md:hidden'>
        <LocationPicker compact />
        <Suspense fallback={<SearchBoxFallback />}><SearchBox /></Suspense>
      </div>
    </header>
  )
}
