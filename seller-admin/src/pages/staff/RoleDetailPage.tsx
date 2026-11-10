import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { InfoIcon, PlusIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import StatusBadge from '@/components/common/StatusBadge'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { teamApi, type ISellerRoleDetail } from '@/api/team'
import { grantedCount, RolePermissionsTable } from './_component/role-ui'

/** Read-only view of a platform-provided seller role */
export default function RoleDetailPage() {
    const { roleId } = useParams<{ roleId: string }>()
    const navigate = useNavigate()
    const { can } = usePermission()
    const [role, setRole] = useState<ISellerRoleDetail | null>(null)

    useEffect(() => {
        if (!roleId) return
        teamApi.getRole(roleId)
            .then(res => setRole(res.data))
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Role not found'))
                navigate('/dashboard/staff?tab=roles', { replace: true })
            })
    }, [roleId, navigate])

    if (!role) {
        return <div><Skeleton className='mb-6 h-14 w-72' /><div className='grid gap-6 lg:grid-cols-5'><Skeleton className='h-96 lg:col-span-3' /><Skeleton className='h-64 lg:col-span-2' /></div></div>
    }

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={role.name}
                description={role.description ?? 'Seller role'}
                actions={can('SELLER_STAFF_ROLES', 'EDIT') && (
                    <Button className='h-10 cursor-pointer' onClick={() => navigate(`/dashboard/staff/new?role=${role.id}`)}>
                        <PlusIcon /> Add staff with this role
                    </Button>
                )}
            />

            <div className='grid gap-6 lg:grid-cols-5'>
                <Card className='h-fit lg:col-span-3'>
                    <CardHeader className='border-b'>
                        <CardTitle className='flex items-center gap-2 text-base font-semibold'><ShieldCheckIcon className='size-4 text-primary' /> Permissions</CardTitle>
                        <CardDescription>Access to {grantedCount(role)} of {role.permissions.length} modules. Manage includes Edit, and Edit includes View.</CardDescription>
                    </CardHeader>
                    <CardContent><RolePermissionsTable role={role} /></CardContent>
                </Card>

                <div className='grid h-fit gap-6 lg:col-span-2'>
                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><UsersIcon className='size-4 text-primary' /> Your staff with this role</CardTitle>
                            <CardDescription>{role.staff.length} {role.staff.length === 1 ? 'person' : 'people'}</CardDescription>
                        </CardHeader>
                        <CardContent className='p-0'>
                            {role.staff.length === 0 ? (
                                <p className='px-4 py-6 text-center text-sm text-muted-foreground'>Nobody has this role yet.</p>
                            ) : (
                                <ul className='divide-y'>
                                    {role.staff.map(s => (
                                        <li key={s.id}>
                                            <Link to={`/dashboard/staff/${s.id}`} className='flex items-center gap-3 px-4 py-3 hover:bg-muted/40'>
                                                <div className='min-w-0 flex-1'>
                                                    <div className='truncate text-sm font-semibold'>{s.fullName}{s.isOwner && <span className='ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase'>Owner</span>}</div>
                                                    <div className='truncate text-xs text-muted-foreground'>{s.email}</div>
                                                </div>
                                                <StatusBadge status={s.status} />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </CardContent>
                    </Card>
                    <p className='flex items-start gap-2 text-xs text-muted-foreground'>
                        <InfoIcon className='mt-0.5 size-3.5 shrink-0' /> Seller roles are provided by the platform. Contact platform support if you need a different combination of access.
                    </p>
                </div>
            </div>
        </div>
    )
}
