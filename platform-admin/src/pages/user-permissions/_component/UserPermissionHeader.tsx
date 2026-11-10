import PageHeader from '@/components/PageHeader'
import { cn } from '@/lib/utils'
import React from 'react'
import { useLocation, useNavigate } from 'react-router'

interface UserPermissionHeaderProps {
    children?: React.ReactNode
    /** Optional counts shown next to the tab labels */
    counts?: { users?: number; roles?: number }
}

const NAVIGATION = [
    { key: 'users', label: 'Users', href: '/dashboard/users-permissions/user' },
    { key: 'roles', label: 'Roles', href: '/dashboard/users-permissions/role' },
] as const

const UserPermissionHeader = ({ children, counts }: UserPermissionHeaderProps) => {
    const navigate = useNavigate()
    const { pathname } = useLocation()

    const isRoles = pathname.startsWith('/dashboard/users-permissions/role')

    return (
        <PageHeader
            title='Users & permissions'
            description='Platform admin users, roles, and per-module permissions'
            actions={children}
        >
            <nav className='flex gap-6 border-b' aria-label='Users and permissions sections'>
                {NAVIGATION.map(item => {
                    const isActive = item.key === 'roles' ? isRoles : !isRoles
                    const count = counts?.[item.key]
                    return (
                        <button
                            key={item.key}
                            type='button'
                            onClick={() => navigate(item.href)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                '-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-semibold transition-colors',
                                isActive
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {item.label}
                            {typeof count === 'number' && (
                                <span className={cn(
                                    'rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold',
                                    isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </nav>
        </PageHeader>
    )
}

export default UserPermissionHeader
