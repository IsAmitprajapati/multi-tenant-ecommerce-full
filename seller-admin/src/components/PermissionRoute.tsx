import { Outlet, useNavigate } from 'react-router'
import { ShieldAlertIcon } from 'lucide-react'
import { usePermission } from '@/hooks/use-permission'
import type { PermissionLevel, PermissionModule } from '@/lib/permissions'
import { Button } from './ui/button'
import { Spinner } from './ui/spinner'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './ui/empty'

interface PermissionRouteProps {
    module: PermissionModule
    level?: PermissionLevel
    children?: React.ReactNode
}

export function AccessDenied({ message }: { message?: string }) {
    const navigate = useNavigate()
    return (
        <Empty className='min-h-[60vh]'>
            <EmptyHeader>
                <EmptyMedia variant='icon' className='bg-destructive/10 text-destructive'>
                    <ShieldAlertIcon />
                </EmptyMedia>
                <EmptyTitle>Access restricted</EmptyTitle>
                <EmptyDescription>
                    {message ?? "Your role doesn't include access to this page. Contact a super admin if you need it."}
                </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button variant='outline' onClick={() => navigate('/dashboard')} className='cursor-pointer'>
                    Back to dashboard
                </Button>
            </EmptyContent>
        </Empty>
    )
}

/** Route guard: renders children/Outlet only if the admin has the required module level. */
const PermissionRoute = ({ module, level = 'VIEW', children }: PermissionRouteProps) => {
    const { can, isLoaded } = usePermission()

    if (!isLoaded) {
        return (
            <div className='flex min-h-[60vh] items-center justify-center'>
                <Spinner className='size-6 text-primary' />
            </div>
        )
    }

    if (!can(module, level)) return <AccessDenied />

    return children ? <>{children}</> : <Outlet />
}

export default PermissionRoute
