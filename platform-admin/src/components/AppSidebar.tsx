import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from './ui/sidebar'
import { BarChart3Icon, LayoutDashboardIcon, LifeBuoyIcon, WalletIcon, LayoutGridIcon, LayoutTemplateIcon, LogOut, MegaphoneIcon, Settings, ShieldCheckIcon, ShoppingBagIcon, Store, Truck, Users } from 'lucide-react'
import PlatfromLogo from '@/assets/platform-logo.png'
import { useLocation, useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { logoutUser } from '@/store/auth/authSlice'
import { usePermission } from '@/hooks/use-permission'
import type { PermissionModule } from '@/lib/permissions'

const AppSidebar = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const user = useAppSelector(state => state.auth.user)
    const dispatch = useAppDispatch()
    const { can, isLoaded } = usePermission()

    const SIDEBAR_NAV: { href: string; label: string; Icon: typeof Store; module: PermissionModule }[] = [
        { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboardIcon, module: "DASHBOARD" },
        { href: "/dashboard/sellers", label: "Sellers", Icon: Store, module: "SELLERS" },
        { href: "/dashboard/commission-payouts", label: "Commission & Payouts", Icon: WalletIcon, module: "COMMISSION_PAYOUTS" },
        { href: "/dashboard/global-catalog", label: "Global Catalog", Icon: LayoutGridIcon, module: "GLOBAL_CATALOG" },
        { href: "/dashboard/storefront", label: "Storefront", Icon: LayoutTemplateIcon, module: "STOREFRONT" },
        { href: "/dashboard/delivery-network", label: "Delivery Network", Icon: Truck, module: "DELIVERY_NETWORK" },
        { href: "/dashboard/customers", label: "Customers", Icon: Users, module: "CUSTOMERS" },
        { href: "/dashboard/orders", label: "Orders", Icon: ShoppingBagIcon, module: "ORDERS" },
        { href: "/dashboard/support", label: "Support", Icon: LifeBuoyIcon, module: "SUPPORT" },
        { href: "/dashboard/marketing", label: "Marketing", Icon: MegaphoneIcon, module: "MARKETING" },
        { href: "/dashboard/reports", label: "Reports", Icon: BarChart3Icon, module: "REPORTS" },
        { href: "/dashboard/users-permissions", label: "Users & Permissions", Icon: ShieldCheckIcon, module: "USERS_PERMISSIONS" },
        { href: "/dashboard/settings", label: "Settings", Icon: Settings, module: "SETTINGS" },
    ]

    const handleLogout = async () => {
        await dispatch(logoutUser())
    }
    return (
        <Sidebar className='bg-muted-foreground'>
            <SidebarHeader>
                <SidebarMenu>
                    <div className="flex items-center gap-3 p-4">
                        <img src={PlatfromLogo} alt="Platform Admin Logo" className="size-9 roundd-xl" />
                        <span className="text-base font-bold text-white">Platform</span>
                    </div>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {
                                SIDEBAR_NAV.filter(item => !isLoaded || can(item.module, 'VIEW')).map((item) => {
                                    // Nested pages (e.g. /users-permissions/role) keep their section highlighted
                                    const isActive = item.href === '/dashboard'
                                        ? location.pathname === '/dashboard'
                                        : location.pathname.startsWith(item.href)
                                    return (
                                        <SidebarMenuItem key={item?.href}>
                                            <SidebarMenuButton onClick={() => navigate(item.href)} className={cn(
                                                'text-accent hover:bg-white/10 hover:text-white px-2 py-3 h-10 hover:cursor-pointer',
                                                isActive && 'bg-[#9fe870]/15 text-[#9fe870]'
                                            )}>
                                                <item.Icon className='size-5' />
                                                {item.label}
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })
                            }
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <div className='flex min-w-0 items-center gap-2.5 rounded-md bg-white/[0.06] p-3'>
                    <div className='flex min-w-0 flex-1 items-center gap-2.5'>
                        {/****Image or Amit Prajapati  => AP */}
                        <div>
                            <Avatar className='shrink-0'>
                                <AvatarImage src={user?.profile_image} />
                                <AvatarFallback className='bg-[#9fe870] font-semibold text-accent-foreground'>{user?.avatarName}</AvatarFallback>
                            </Avatar>
                        </div>


                        {/****Full Name */}
                        <div className='min-w-0 flex-1'>
                            <div className='truncate text-sm font-semibold text-white'>{user?.fullName}</div>
                            <div className='truncate text-xs text-accent'>
                                {user?.role?.name ?? 'No role assigned'}
                            </div>
                        </div>
                    </div>
                    <button onClick={handleLogout} aria-label='Sign out' className='shrink-0 cursor-pointer p-2 rounded-md text-accent hover:bg-white/10 hover:text-white'>
                        <LogOut className='size-4' />
                    </button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}

export default AppSidebar