import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { createColumnHelper } from '@tanstack/react-table'
import { MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon, ShieldCheckIcon, UserCogIcon } from 'lucide-react'
import UserPermissionHeader from './_component/UserPermissionHeader'
import StatusBadge from './_component/StatusBadge'
import AssignRoleDialog from './_component/AssignRoleDialog'
import ConfirmDialog from './_component/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { usePermission } from '@/hooks/use-permission'
import { fetchAllAdminUsers, updateAdminUserStatus, type IAdminUsers } from '@/store/users/userSlice'
import { fetchRoles } from '@/store/roles/roleSlice'

const columnHelper = createColumnHelper<DataTableFeatures, IAdminUsers>()

const initials = (name = '') =>
    name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

const UsersPage = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { adminUsers, isLoading, isSaving } = useAppSelector(state => state.user)
    const roles = useAppSelector(state => state.roles.roles)
    const { can, userId: currentUserId } = usePermission()
    const canEdit = can('USERS_PERMISSIONS', 'EDIT')

    const [search, setSearch] = useState('')
    const [roleFilter, setRoleFilter] = useState<string>('ALL')
    const [statusFilter, setStatusFilter] = useState<string>('ALL')
    const [assignFor, setAssignFor] = useState<IAdminUsers | null>(null)
    const [statusFor, setStatusFor] = useState<IAdminUsers | null>(null)

    useEffect(() => {
        dispatch(fetchAllAdminUsers({}))
        dispatch(fetchRoles())
    }, [dispatch])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return adminUsers.filter(u =>
            (roleFilter === 'ALL' || (roleFilter === 'NONE' ? !u.role : u.role?.id === roleFilter)) &&
            (statusFilter === 'ALL' || u.status === statusFilter) &&
            (!q || u.fullName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
        )
    }, [adminUsers, search, roleFilter, statusFilter])

    const handleToggleStatus = async () => {
        if (!statusFor) return
        const next = statusFor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        const result = await dispatch(updateAdminUserStatus({ id: statusFor.id, status: next }))
        if (updateAdminUserStatus.fulfilled.match(result)) {
            toast.success(result.payload?.message ?? 'Status updated')
            setStatusFor(null)
        } else {
            toast.error((result.payload as string) ?? 'Failed to update status')
        }
    }

    const columns = columnHelper.columns([
        columnHelper.accessor('fullName', {
            header: 'User',
            cell: ({ row }) => {
                const u = row.original
                const isMe = u.id === currentUserId
                return (
                    <div className='flex items-center gap-3'>
                        <Avatar className='size-9'>
                            <AvatarImage src={u.profileImage ?? undefined} />
                            <AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>{initials(u.fullName)}</AvatarFallback>
                        </Avatar>
                        <div className='min-w-0'>
                            <div className='flex items-center gap-2 font-semibold'>
                                <span className='truncate'>{u.fullName}</span>
                                {isMe && <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase'>You</span>}
                            </div>
                            <div className='truncate text-xs text-muted-foreground'>{u.email}</div>
                        </div>
                    </div>
                )
            },
        }),
        columnHelper.accessor('role', {
            header: 'Role',
            cell: ({ row }) => {
                const role = row.original.role
                if (!role) return <span className='text-xs font-medium text-amber-700'>No role assigned</span>
                return (
                    <div>
                        <span className='inline-flex items-center gap-1.5 text-sm font-medium'>
                            <ShieldCheckIcon className='size-3.5 text-primary' />
                            {role.name}
                        </span>
                        {role.status !== 'ACTIVE' && <div className='text-[11px] text-destructive'>Role inactive</div>}
                    </div>
                )
            },
        }),
        columnHelper.accessor('lastActiveAt', {
            header: 'Last active',
            cell: ({ row }) => {
                const v = row.original.lastActiveAt
                return <span className='text-sm text-muted-foreground'>{v ? moment(v).fromNow() : 'Never'}</span>
            },
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const u = row.original
                const isMe = u.id === currentUserId
                if (!canEdit) return null
                return (
                    <div className='flex justify-end'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${u.fullName}`}>
                                    <MoreHorizontalIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-44'>
                                <DropdownMenuItem
                                    className='cursor-pointer'
                                    onSelect={() => navigate('/dashboard/users-permissions/user/edit', { state: { userId: u.id } })}
                                >
                                    <PencilIcon /> Edit details
                                </DropdownMenuItem>
                                <DropdownMenuItem className='cursor-pointer' disabled={isMe} onSelect={() => setAssignFor(u)}>
                                    <UserCogIcon /> Assign role
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className='cursor-pointer'
                                    variant={u.status === 'ACTIVE' ? 'destructive' : 'default'}
                                    disabled={isMe}
                                    onSelect={() => setStatusFor(u)}
                                >
                                    <PowerIcon /> {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }),
    ])

    return (
        <div>
            <UserPermissionHeader counts={{ users: adminUsers.length, roles: roles.length }}>
                {canEdit && (
                    <Button className='h-10 cursor-pointer' onClick={() => navigate('/dashboard/users-permissions/user/create')}>
                        <PlusIcon />
                        Add user
                    </Button>
                )}
            </UserPermissionHeader>

            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                <div className='relative w-full md:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                        placeholder='Search by name or email...'
                        className='h-10 bg-white pl-9'
                        onChange={e => setSearch(e.target.value)}
                        value={search}
                    />
                </div>
                <div className='flex gap-2 md:ml-auto'>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className='h-10! min-w-40 bg-white'>
                            <SelectValue placeholder='All roles' />
                        </SelectTrigger>
                        <SelectContent position='popper'>
                            <SelectItem value='ALL'>All roles</SelectItem>
                            {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            <SelectItem value='NONE'>No role</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className='h-10! min-w-32 bg-white'>
                            <SelectValue placeholder='All statuses' />
                        </SelectTrigger>
                        <SelectContent position='popper'>
                            <SelectItem value='ALL'>All statuses</SelectItem>
                            <SelectItem value='ACTIVE'>Active</SelectItem>
                            <SelectItem value='INACTIVE'>Inactive</SelectItem>
                            <SelectItem value='SUSPENDED'>Suspended</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className='mt-3'>
                <DataTable columns={columns} data={filtered} isLoading={isLoading} />
            </div>
            <div className='mt-3 text-xs text-muted-foreground'>
                Showing {filtered.length} of {adminUsers.length} users
            </div>

            <AssignRoleDialog open={Boolean(assignFor)} onOpenChange={open => !open && setAssignFor(null)} user={assignFor} />

            {statusFor && (
                <ConfirmDialog
                    open={Boolean(statusFor)}
                    onOpenChange={open => !open && setStatusFor(null)}
                    title={`${statusFor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${statusFor.fullName}?`}
                    description={statusFor.status === 'ACTIVE'
                        ? 'They will be signed out of every device and won’t be able to log in until re-activated.'
                        : 'They will be able to sign in again with their existing credentials.'}
                    confirmLabel={statusFor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    destructive={statusFor.status === 'ACTIVE'}
                    loading={isSaving}
                    onConfirm={handleToggleStatus}
                />
            )}
        </div>
    )
}

export default UsersPage
