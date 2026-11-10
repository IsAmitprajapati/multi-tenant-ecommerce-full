import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { createColumnHelper } from '@tanstack/react-table'
import { EyeIcon, MailIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon, ShieldCheckIcon, UserCogIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { teamApi, type ISellerRole, type IStaff } from '@/api/team'
import { grantedCount, roleSummary } from './_component/role-ui'

const staffColumn = createColumnHelper<DataTableFeatures, IStaff>()
const roleColumn = createColumnHelper<DataTableFeatures, ISellerRole>()
const initials = (n = '') => n.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')

type Tab = 'staff' | 'roles'

export default function StaffPage() {
    const [params, setParams] = useSearchParams()
    const tab: Tab = params.get('tab') === 'roles' ? 'roles' : 'staff'
    const navigate = useNavigate()
    const { can, userId } = usePermission()
    const canEdit = can('SELLER_STAFF_ROLES', 'EDIT')

    const [staff, setStaff] = useState<IStaff[]>([])
    const [roles, setRoles] = useState<ISellerRole[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [statusFor, setStatusFor] = useState<IStaff | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        Promise.all([teamApi.listStaff(), teamApi.listRoles()])
            .then(([s, r]) => { setStaff(s.data); setRoles(r.data) })
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load staff')))
            .finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])

    const q = search.trim().toLowerCase()
    const filteredStaff = useMemo(() => staff.filter(s =>
        !q || s.fullName.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || s.role?.name.toLowerCase().includes(q)), [staff, q])
    const filteredRoles = useMemo(() => roles.filter(r =>
        !q || r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)), [roles, q])

    const toggleStatus = async () => {
        if (!statusFor) return
        setBusy(true)
        try {
            const res = await teamApi.setStatus(statusFor.id, statusFor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
            setStaff(list => list.map(x => (x.id === res.data.id ? res.data : x)))
            toast.success(res.message ?? 'Updated')
            setStatusFor(null)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not update status'))
        } finally { setBusy(false) }
    }

    const resend = async (s: IStaff) => {
        try { toast.success((await teamApi.resendInvite(s.id)).message) }
        catch (err) { toast.error(getAxiosErrorMessage(err, 'Could not resend the invite')) }
    }

    const staffColumns = staffColumn.columns([
        staffColumn.accessor('fullName', {
            header: 'Staff member',
            cell: ({ row }) => {
                const s = row.original
                return (
                    <button type='button' onClick={() => navigate(`/dashboard/staff/${s.id}`)} className='group flex cursor-pointer items-center gap-3 text-left'>
                        <Avatar className='size-9 shrink-0'><AvatarFallback className='bg-primary/10 text-xs font-semibold text-primary'>{initials(s.fullName)}</AvatarFallback></Avatar>
                        <div className='min-w-0'>
                            <div className='flex items-center gap-2 font-semibold group-hover:text-primary'>
                                <span className='truncate'>{s.fullName}</span>
                                {s.isOwner && <span className='rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase'>Owner</span>}
                                {s.id === userId && <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase'>You</span>}
                            </div>
                            <div className='truncate text-xs text-muted-foreground'>{s.email}</div>
                        </div>
                    </button>
                )
            },
        }),
        staffColumn.accessor('role', {
            header: 'Role',
            cell: ({ row }) => row.original.role
                ? <span className='inline-flex items-center gap-1.5 text-sm font-medium'><ShieldCheckIcon className='size-3.5 text-primary' />{row.original.role.name}</span>
                : <span className='text-xs text-amber-700'>No role</span>,
        }),
        staffColumn.accessor('lastActiveAt', {
            header: 'Last active',
            cell: ({ row }) => row.original.invitePending
                ? <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800'><MailIcon className='size-3' /> Invite pending</span>
                : <span className='text-sm text-muted-foreground'>{moment(row.original.lastActiveAt).fromNow()}</span>,
        }),
        staffColumn.accessor('status', {
            header: 'Status',
            cell: ({ row }) => <StatusBadge status={row.original.status} />,
        }),
        staffColumn.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const s = row.original
                const locked = s.isOwner || s.id === userId
                return (
                    <div className='flex items-center justify-end gap-1'>
                        <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={() => navigate(`/dashboard/staff/${s.id}`)}>
                            <EyeIcon /> View
                        </Button>
                        {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${s.fullName}`}><MoreHorizontalIcon /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='w-48'>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`/dashboard/staff/${s.id}`)}><EyeIcon /> View details</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`/dashboard/staff/${s.id}/edit`)}><PencilIcon /> Edit details</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' disabled={locked} onSelect={() => navigate(`/dashboard/staff/${s.id}/edit`)}><UserCogIcon /> Change role</DropdownMenuItem>
                                    {s.invitePending && <DropdownMenuItem className='cursor-pointer' onSelect={() => resend(s)}><MailIcon /> Resend invite</DropdownMenuItem>}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className='cursor-pointer' disabled={locked}
                                        variant={s.status === 'ACTIVE' ? 'destructive' : 'default'} onSelect={() => setStatusFor(s)}>
                                        <PowerIcon /> {s.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )
            },
        }),
    ])

    const roleColumns = roleColumn.columns([
        roleColumn.accessor('name', {
            header: 'Role',
            cell: ({ row }) => (
                <button type='button' onClick={() => navigate(`/dashboard/staff/roles/${row.original.id}`)} className='group cursor-pointer text-left'>
                    <div className='flex items-center gap-2 font-semibold group-hover:text-primary'><ShieldCheckIcon className='size-3.5 text-primary' />{row.original.name}</div>
                    <div className='mt-0.5 max-w-md text-xs text-muted-foreground'>{row.original.description}</div>
                </button>
            ),
        }),
        roleColumn.accessor('permissions', {
            header: 'Access',
            cell: ({ row }) => {
                const r = row.original
                const total = r.permissions.length
                return (
                    <div className='min-w-44'>
                        <div className='flex items-center gap-2'>
                            <div className='h-1.5 w-20 overflow-hidden rounded-full bg-muted'>
                                <div className='h-full rounded-full bg-primary' style={{ width: `${(grantedCount(r) / total) * 100}%` }} />
                            </div>
                            <span className='text-xs text-muted-foreground'>{grantedCount(r)}/{total} modules</span>
                        </div>
                        <div className='mt-1 max-w-xs truncate text-[11px] text-muted-foreground' title={roleSummary(r, 99)}>{roleSummary(r)}</div>
                    </div>
                )
            },
        }),
        roleColumn.accessor('staffCount', {
            header: 'Your staff',
            cell: ({ row }) => <span className='tabular-nums'>{row.original.staffCount}</span>,
        }),
        roleColumn.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => (
                <div className='flex justify-end'>
                    <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={() => navigate(`/dashboard/staff/roles/${row.original.id}`)}>
                        <EyeIcon /> View
                    </Button>
                </div>
            ),
        }),
    ])

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'staff', label: 'Staff', count: staff.length },
        { key: 'roles', label: 'Roles', count: roles.length },
    ]

    return (
        <div className='pb-10'>
            <PageHeader
                title='Staff & roles'
                description='People who can sign in to your seller dashboard, and what each role can do.'
                actions={canEdit && <Button className='h-10 cursor-pointer' onClick={() => navigate('/dashboard/staff/new')}><PlusIcon /> Add staff</Button>}
            >
                <nav className='flex gap-6 border-b' aria-label='Staff and roles sections'>
                    {tabs.map(t => {
                        const active = tab === t.key
                        return (
                            <button key={t.key} type='button' onClick={() => { setSearch(''); setParams(t.key === 'roles' ? { tab: 'roles' } : {}) }}
                                aria-current={active ? 'page' : undefined}
                                className={cn('-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-1 pb-2.5 text-sm font-semibold transition-colors',
                                    active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                                {t.label}
                                <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] leading-none font-semibold', active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>{t.count}</span>
                            </button>
                        )
                    })}
                </nav>
            </PageHeader>

            <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='relative w-full md:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input placeholder={tab === 'staff' ? 'Search by name, email or role…' : 'Search roles…'} className='h-10 bg-white pl-9'
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                {tab === 'roles' && (
                    <p className='flex items-center gap-1.5 text-xs text-muted-foreground'>
                        <ShieldCheckIcon className='size-3.5' /> Roles are provided by the platform — assign them when you add or edit staff.
                    </p>
                )}
            </div>

            <div className='mt-3'>
                {tab === 'staff'
                    ? <DataTable columns={staffColumns} data={filteredStaff} isLoading={loading} />
                    : <DataTable columns={roleColumns} data={filteredRoles} isLoading={loading} />}
            </div>
            <div className='mt-3 text-xs text-muted-foreground'>
                {tab === 'staff' ? `Showing ${filteredStaff.length} of ${staff.length} staff members` : `Showing ${filteredRoles.length} of ${roles.length} roles`}
            </div>

            {statusFor && (
                <ConfirmDialog
                    open
                    onOpenChange={open => !open && setStatusFor(null)}
                    title={`${statusFor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${statusFor.fullName}?`}
                    description={statusFor.status === 'ACTIVE'
                        ? 'They’ll be signed out of every device and won’t be able to sign in until re-activated.'
                        : 'They’ll be able to sign in again.'}
                    confirmLabel={statusFor.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    destructive={statusFor.status === 'ACTIVE'}
                    loading={busy}
                    onConfirm={toggleStatus}
                />
            )}
        </div>
    )
}
