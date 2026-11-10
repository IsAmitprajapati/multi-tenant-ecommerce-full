import TitleHeading from '@/components/Heading'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

interface UserPermissionHeader {
    children: React.ReactNode
}
const UserPermissionHeader = ({ children }: UserPermissionHeader) => {
    const navigate = useNavigate()
    const location = useLocation()

    const navigation = [
        {
            label: "User",
            href: "/dashboard/users-permissions/user"
        },
        {
            label: "Role",
            href: "/dashboard/users-permissions/role"
        }
    ]
    return (
        <div>
            <div className='flex flex-col lg:flex-row items-center'>
                <TitleHeading
                    title='Users & permissions'
                    description='Platform admin users, roles, and per-module permissions'
                />
                {children}
            </div>
            <Tabs className='gap-0'>
                <TabsList className='mt-4 bg-transparent gap-x-3'>
                    {
                        navigation.map((item, index) => {
                            const isActive = item.href === location.pathname
                            return (
                                <TabsTrigger 
                                 value={item?.label} 
                                 onClick={() => navigate(item.href)}
                                 className={cn(
                                    'text-base bg-transparent border-4 rounded-none py-5 cursor-pointer',
                                    isActive && "bg-transparent border-b-primary text-primary"
                                 )}
                                >
                                    {item.label}
                                </TabsTrigger>
                            )
                        })
                    }
                </TabsList>
                <Separator className='mt-2'/>
            </Tabs>
        </div>
    )
}

export default UserPermissionHeader