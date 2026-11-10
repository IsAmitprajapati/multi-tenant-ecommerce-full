import Logo from './Logo'
import LocationPicker from './LocationPicker'
import SearchBox from './SearchBox'
import UserMenu from './UserMenu'

export default function SiteHeader() {
  return (
    <header className='sticky top-0 z-30 border-b border-n-200 bg-white'>
      <div className='mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:h-[72px] sm:gap-5 sm:px-8'>
        <Logo />
        <div className='hidden md:block'><LocationPicker /></div>
        <SearchBox className='hidden max-w-[480px] flex-1 md:block' />
        <div className='flex-1' />
        <UserMenu />
      </div>
      <div className='grid gap-2 px-4 pb-3 md:hidden'>
        <LocationPicker compact />
        <SearchBox />
      </div>
    </header>
  )
}
