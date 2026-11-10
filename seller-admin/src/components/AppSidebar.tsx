import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'
import {
    BarChart3Icon, LayoutDashboardIcon, LayersIcon, LogOut, PackageIcon, PercentIcon, RotateCcwIcon,
    Settings, ShoppingBagIcon, StarIcon, Truck, UserCogIcon, Users,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { logoutUser } from '@/store/auth/authSlice'
import { usePermission } from '@/hooks/use-permission'
import { BrandLogo } from './brand/SiteHeader'
import type { PermissionModule } from '@/lib/permissions'

/** Seller admin menu — each item is shown only if the user's role can VIEW its module */
export const SELLER_NAV: { href: string; label: string; Icon: typeof PackageIcon; module: PermissionModule }[] = [
    { href: '/dashboard', label: 'Dashboard', Icon: LayoutDashboardIcon, module: 'SELLER_DASHBOARD' },
    { href: '/dashboard/products', label: 'Products', Icon: PackageIcon, module: 'SELLER_PRODUCTS' },
    { href: '/dashboard/collections', label: 'Collections', Icon: LayersIcon, module: 'SELLER_COLLECTIONS' },
    { href: '/dashboard/orders', label: 'Orders', Icon: ShoppingBagIcon, module: 'SELLER_ORDERS' },
    { href: '/dashboard/returns', label: 'Returns', Icon: RotateCcwIcon, module: 'SELLER_RETURNS' },
    { href: '/dashboard/customers', label: 'Customers', Icon: Users, module: 'SELLER_CUSTOMERS' },
    { href: '/dashboard/discounts', label: 'Discounts', Icon: PercentIcon, module: 'SELLER_DISCOUNTS' },
    { href: '/dashboard/delivery', label: 'Delivery', Icon: Truck, module: 'SELLER_DELIVERY' },
    { href: '/dashboard/reviews', label: 'Reviews', Icon: StarIcon, module: 'SELLER_REVIEWS' },
    { href: '/dashboard/settings', label: 'Seller settings', Icon: Settings, module: 'SELLER_SETTINGS' },
    { href: '/dashboard/staff', label: 'Staff & roles', Icon: UserCogIcon, module: 'SELLER_STAFF_ROLES' },
    { href: '/dashboard/reports', label: 'Reports', Icon: BarChart3Icon, module: 'SELLER_REPORTS' },
]

const AppSidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const user = useAppSelector(state => state.auth.user)
    const dispatch = useAppDispatch()
    const { can, isLoaded } = usePermission()
    const seller = user?.seller

    return (
        <Sidebar className='bg-muted-foreground'>
            <SidebarHeader>
                <SidebarMenu>
                    <div className='grid gap-3 p-4'>
                        <BrandLogo inverted to='/dashboard' />
                        {seller && (
                            <div className='flex min-w-0 items-center gap-2 rounded-md bg-white/[0.06] px-2.5 py-2'>
                                <span className='size-2.5 shrink-0 rounded-full' style={{ background: seller.brandColor }} aria-hidden />
                                <span className='truncate text-xs font-semibold text-white'>{seller.name}</span>
                            </div>
                        )}
                    </div>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {SELLER_NAV.filter(item => !isLoaded || can(item.module, 'VIEW')).map(item => {
                                const isActive = item.href === '/dashboard'
                                    ? location.pathname === '/dashboard'
                                    : location.pathname.startsWith(item.href)
                                return (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton onClick={() => navigate(item.href)} className={cn(
                                            'text-accent hover:bg-white/10 hover:text-white px-2 py-3 h-10 hover:cursor-pointer',
                                            isActive && 'bg-[#9fe870]/15 text-[#9fe870]'
                                        )}>
                                            <item.Icon className='size-5' />
                                            {item.label}
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <div className='flex min-w-0 items-center gap-2.5 rounded-md bg-white/[0.06] p-3'>
                    <div className='flex min-w-0 flex-1 items-center gap-2.5'>
                        <Avatar className='shrink-0'>
                            <AvatarImage src={user?.profile_image} />
                            <AvatarFallback className='bg-[#9fe870] font-semibold text-accent-foreground'>{user?.avatarName}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0 flex-1'>
                            <div className='truncate text-sm font-semibold text-white'>{user?.fullName}</div>
                            <div className='truncate text-xs text-accent'>{user?.role?.name ?? 'No role assigned'}</div>
                        </div>
                    </div>
                    <button onClick={() => dispatch(logoutUser())} aria-label='Sign out' className='shrink-0 cursor-pointer rounded-md p-2 text-accent hover:bg-white/10 hover:text-white'>
                        <LogOut className='size-4' />
                    </button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

export default AppSidebar
