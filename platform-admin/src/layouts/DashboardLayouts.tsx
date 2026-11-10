import AppSidebar from '@/components/AppSidebar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { useAppSelector } from '@/hooks/use-store'
import { SearchIcon, User2Icon } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { PAGE_SCROLL_ID } from '@/components/PageHeader'

const DashboardLayouts = () => {
  const user = useAppSelector(state => state?.auth?.user)
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className='h-svh overflow-hidden'>
        {/* App shell: top bar fixed, only the page area scrolls */}
        <main className='flex h-full min-h-0 flex-col bg-(--page)'>
          <header className="z-40 flex h-16 shrink-0 items-center gap-2 border-b bg-white px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation='vertical'
              className="mr-2 data-[orientation=vertical]:h-4 my-auto"
            />
            <div className='w-full max-w-xs lg:max-w-sm h-10 relative'>
              <SearchIcon className='size-4 absolute mt-3 ml-3 text-primary' />
              <Input
                className='w-full h-full pl-9'
                placeholder='search store, order, agent....'
              />
            </div>

            {/****Right Section */}
            <div className='ml-auto'>
              <Popover>
                <PopoverTrigger>
                  <Avatar className='cursor-pointer'>
                    <AvatarImage src={user?.profile_image} />
                    <AvatarFallback className='bg-[#9fe870] font-semibold text-accent-foreground'>{user?.avatarName}</AvatarFallback>
                  </Avatar>
                </PopoverTrigger>
                <PopoverContent>
                    <Link
                      to={'/dashboard/my-account'}
                      className='flex items-center gap-3'
                    > 
                      <User2Icon className='size-4'/>
                      My Account
                    </Link>
                </PopoverContent>
              </Popover>

            </div>
          </header>
          <div id={PAGE_SCROLL_ID} className='min-h-0 flex-1 overflow-y-auto'>
            <div className='container mx-auto p-4 lg:p-6'>
              <Outlet />
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default DashboardLayouts