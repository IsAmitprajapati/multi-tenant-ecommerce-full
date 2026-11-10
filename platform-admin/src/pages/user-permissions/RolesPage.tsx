import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import { EyeIcon, LockIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon, Trash2Icon } from 'lucide-react'
import UserPermissionHeader from './_component/UserPermissionHeader'
import ConfirmDialog from './_component/ConfirmDialog'
import StatusBadge from './_component/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { deleteRole, fetchRoles, updateRoleStatus } from '@/store/roles/roleSlice'
import { fetchAllAdminUsers } from '@/store/users/userSlice'
import type { IRoleItem } from '@/api/role'
import { modulesForUserType } from '@/lib/permissions'

type ConfirmState = { type: 'status' | 'delete'; role: IRoleItem } | null

const columnHelper = createColumnHelper<DataTableFeatures, IRoleItem>()

const RolesPage = () => {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { roles, isLoading, isSaving } = useAppSelector(state => state.roles)
    const usersCount = useAppSelector(state => state.user.adminUsers.length)
    const { can } = usePermission()
    const canManage = can('USERS_PERMISSIONS', 'MANAGE')

    const [search, setSearch] = useState('')
    const [confirm, setConfirm] = useState<ConfirmState>(null)

    useEffect(() => {
        dispatch(fetchRoles())
        dispatch(fetchAllAdminUsers({}))
    }, [dispatch])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return roles.filter(r =>
            (!q || r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q))
        )
    }, [roles, search])

    const ROLES = '/dashboard/users-permissions/role'
    const viewRole = (r: IRoleItem) => navigate(`${ROLES}/${r.id}`)
    const editRole = (r: IRoleItem) => navigate(`${ROLES}/${r.id}/edit`)

    const handleConfirm = async () => {
        if (!confirm) return
        const { role, type } = confirm
        const result = type === 'delete'
            ? await dispatch(deleteRole(role.id))
            : await dispatch(updateRoleStatus({ id: role.id, status: role.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }))

        if (deleteRole.fulfilled.match(result) || updateRoleStatus.fulfilled.match(result)) {
            toast.success(result.payload?.message ?? 'Done')
            setConfirm(null)
        } else {
            toast.error((result.payload as string) ?? 'Something went wrong')
        }
    }

    const columns = columnHelper.columns([
        columnHelper.accessor('name', {
            header: 'Role',
            cell: ({ row }) => {
                const r = row.original
                return (
                    <button type='button' onClick={() => viewRole(r)} className='group cursor-pointer text-left'>
                        <div className='flex items-center gap-2 font-semibold group-hover:text-primary'>
                            {r.name}
                            {r.isSystem && (
                                <span className='inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase'>
                                    <LockIcon className='size-2.5' /> System
                                </span>
                            )}
                        </div>
                        {r.description && <div className='max-w-sm truncate text-xs text-muted-foreground'>{r.description}</div>}
                    </button>
                )
            },
        }),
        columnHelper.accessor('permissions', {
            header: 'Access',
            cell: ({ row }) => {
                const r = row.original
                const total = modulesForUserType(r.userType).length
                if (total === 0) return <span className='text-xs text-muted-foreground'>No admin access</span>
                const granted = r.permissions.filter(p => p.level !== 'NONE').length
                return (
                    <div className='flex items-center gap-2'>
                        <div className='h-1.5 w-20 overflow-hidden rounded-full bg-muted'>
                            <div className='h-full rounded-full bg-primary' style={{ width: `${(granted / total) * 100}%` }} />
                        </div>
                        <span className='text-xs text-muted-foreground'>{granted}/{total} modules</span>
                    </div>
                )
            },
        }),
        columnHelper.accessor('usersCount', {
            header: 'Users assigned',
            cell: ({ row }) => <span className='tabular-nums'>{row.original.usersCount}</span>,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const r = row.original
                const editable = canManage && !r.isSystem
                return (
                    <div className='flex justify-end'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${r.name}`}>
                                    <MoreHorizontalIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-44'>
                                <DropdownMenuItem onSelect={() => viewRole(r)} className='cursor-pointer'>
                                    <EyeIcon /> View permissions
                                </DropdownMenuItem>
                                {editable && (
                                    <>
                                        <DropdownMenuItem onSelect={() => editRole(r)} className='cursor-pointer'>
                                            <PencilIcon /> Edit role
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setConfirm({ type: 'status', role: r })} className='cursor-pointer'>
                                            <PowerIcon /> {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            variant='destructive'
                                            onSelect={() => setConfirm({ type: 'delete', role: r })}
                                            className='cursor-pointer'
                                        >
                                            <Trash2Icon /> Delete
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }),
    ])

    const confirmCopy = confirm && (
        confirm.type === 'delete'
            ? {
                title: `Delete "${confirm.role.name}"?`,
                description: confirm.role.usersCount > 0
                    ? `This role is assigned to ${confirm.role.usersCount} user(s). Reassign them to another role before deleting.`
                    : 'This permanently removes the role and its permissions. This cannot be undone.',
                confirmLabel: 'Delete role',
                destructive: true,
            }
            : confirm.role.status === 'ACTIVE'
                ? {
                    title: `Deactivate "${confirm.role.name}"?`,
                    description: `Users with this role (${confirm.role.usersCount}) will immediately lose all access it grants until it is re-activated.`,
                    confirmLabel: 'Deactivate',
                    destructive: true,
                }
                : {
                    title: `Activate "${confirm.role.name}"?`,
                    description: 'Users with this role will regain the access it grants.',
                    confirmLabel: 'Activate',
                    destructive: false,
                }
    )

    return (
        <div>
            <UserPermissionHeader counts={{ users: usersCount, roles: roles.length }}>
                {canManage && (
                    <Button className='h-10 cursor-pointer' onClick={() => navigate(`${ROLES}/create`)}>
                        <PlusIcon />
                        Create role
                    </Button>
                )}
            </UserPermissionHeader>

            <div className='mt-5'>
                <div className='relative w-full md:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                        placeholder='Search roles...'
                        className='h-10 bg-white pl-9'
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className='mt-3'>
                <DataTable columns={columns} data={filtered} isLoading={isLoading} />
            </div>
            <div className='mt-3 text-xs text-muted-foreground'>
                Showing {filtered.length} of {roles.length} roles
            </div>


            {confirmCopy && (
                <ConfirmDialog
                    open={Boolean(confirm)}
                    onOpenChange={open => !open && setConfirm(null)}
                    {...confirmCopy}
                    loading={isSaving}
                    onConfirm={handleConfirm}
                />
            )}
        </div>
    )
}

export default RolesPage
