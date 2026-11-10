import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { createColumnHelper } from '@tanstack/react-table'
import { EyeIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { sellerApi, type ISeller, type SellerStatusAction } from '@/api/seller'
import { ACTION_COPY, KYC_PILL, Pill, STATUS_PILL } from './_component/seller-status'

type Filter = 'ALL' | 'ACTIVE' | 'PENDING_KYC' | 'SUSPENDED'

const FILTERS: { value: Filter; label: string }[] = [
    { value: 'ALL', label: 'All sellers' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'PENDING_KYC', label: 'Pending KYC' },
    { value: 'SUSPENDED', label: 'Suspended' },
]

const columnHelper = createColumnHelper<DataTableFeatures, ISeller>()

const SellersPage = () => {
    const navigate = useNavigate()
    const { can } = usePermission()
    const canOnboard = can('SELLERS', 'EDIT')
    const canManage = can('SELLERS', 'MANAGE')

    const [sellers, setSellers] = useState<ISeller[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState<Filter>('ALL')
    const [pending, setPending] = useState<{ seller: ISeller; action: SellerStatusAction } | null>(null)
    const [acting, setActing] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        sellerApi.list()
            .then(res => setSellers(res.data))
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load sellers')))
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => { load() }, [load])

    const counts = useMemo(() => ({
        ALL: sellers.length,
        ACTIVE: sellers.filter(s => s.status === 'ACTIVE').length,
        PENDING_KYC: sellers.filter(s => s.kycStatus === 'UNDER_REVIEW' || s.kycStatus === 'PENDING').length,
        SUSPENDED: sellers.filter(s => s.status === 'SUSPENDED').length,
    }), [sellers])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return sellers.filter(s => {
            const matchFilter =
                filter === 'ALL' ||
                (filter === 'ACTIVE' && s.status === 'ACTIVE') ||
                (filter === 'SUSPENDED' && s.status === 'SUSPENDED') ||
                (filter === 'PENDING_KYC' && (s.kycStatus === 'UNDER_REVIEW' || s.kycStatus === 'PENDING'))
            const matchSearch = !q || [s.name, s.slug, s.owner.email, s.owner.fullName, s.businessDetails?.legalBusinessName]
                .some(v => v?.toLowerCase().includes(q))
            return matchFilter && matchSearch
        })
    }, [sellers, search, filter])

    const runAction = async () => {
        if (!pending) return
        setActing(true)
        try {
            const res = await sellerApi.changeStatus(pending.seller.id, pending.action)
            setSellers(list => list.map(s => (s.id === res.data.id ? res.data : s)))
            toast.success(res.message ?? 'Updated')
            setPending(null)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setActing(false)
        }
    }

    const columns = columnHelper.columns([
        columnHelper.accessor('name', {
            header: 'Seller',
            cell: ({ row }) => {
                const s = row.original
                return (
                    <button type='button' onClick={() => navigate(`/dashboard/sellers/${s.id}`)} className='group flex cursor-pointer items-center gap-3 text-left'>
                        {s.logoUrl
                            ? <img src={s.logoUrl} alt='' className='size-9 rounded-lg object-cover' />
                            : <span className='flex size-9 items-center justify-center rounded-lg text-sm font-bold text-white' style={{ background: s.brandColor }}>
                                {s.name.slice(0, 1).toUpperCase()}
                            </span>}
                        <div className='min-w-0'>
                            <div className='truncate font-semibold group-hover:text-primary'>{s.name}</div>
                            <div className='truncate text-xs text-muted-foreground'>/{s.slug}</div>
                        </div>
                    </button>
                )
            },
        }),
        columnHelper.accessor('categoryLabel', {
            header: 'Category',
            cell: ({ row }) => (
                <div>
                    <div className='text-sm'>{row.original.categoryLabel}</div>
                    <div className='text-xs text-muted-foreground'>{row.original.commissionRate}% commission</div>
                </div>
            ),
        }),
        columnHelper.accessor('owner', {
            header: 'Owner',
            cell: ({ row }) => (
                <div className='min-w-0'>
                    <div className='truncate text-sm font-medium'>{row.original.owner.fullName}</div>
                    <div className='truncate text-xs text-muted-foreground'>{row.original.owner.email}</div>
                </div>
            ),
        }),
        columnHelper.accessor('kycStatus', {
            header: 'KYC',
            cell: ({ row }) => <Pill {...KYC_PILL[row.original.kycStatus]} />,
        }),
        columnHelper.accessor('status', {
            header: 'Status',
            cell: ({ row }) => <Pill {...STATUS_PILL[row.original.status]} />,
        }),
        columnHelper.accessor('createdAt', {
            header: 'Joined',
            cell: ({ row }) => <span className='text-sm text-muted-foreground'>{moment(row.original.createdAt).fromNow()}</span>,
        }),
        columnHelper.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const s = row.original
                const view = () => navigate(`/dashboard/sellers/${s.id}`)
                const editDetails = () => navigate(`/dashboard/sellers/${s.id}/edit`)
                if (!canManage) {
                    return (
                        <div className='flex justify-end gap-1'>
                            <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={view}>
                                <EyeIcon /> View
                            </Button>
                            {canOnboard && (
                                <Button size='sm' variant='ghost' className='cursor-pointer' onClick={editDetails}>
                                    <PencilIcon /> Edit
                                </Button>
                            )}
                        </div>
                    )
                }
                return (
                    <div className='flex items-center justify-end gap-1'>
                        <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={view}>
                            <EyeIcon /> View
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${s.name}`}>
                                    <MoreHorizontalIcon />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-44'>
                                <DropdownMenuItem className='cursor-pointer' onSelect={view}>
                                    <EyeIcon /> View details
                                </DropdownMenuItem>
                                <DropdownMenuItem className='cursor-pointer' onSelect={editDetails}>
                                    <PencilIcon /> Edit details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {/* KYC approve / reject lives on the seller's View page */}
                                {s.status === 'SUSPENDED' ? (
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => setPending({ seller: s, action: 'REACTIVATE' })}>
                                        <PowerIcon /> Reactivate
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setPending({ seller: s, action: 'SUSPEND' })}>
                                        <PowerIcon /> Suspend seller
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }),
    ])

    const copy = pending && ACTION_COPY[pending.action]

    return (
        <div>
            <PageHeader
                    title='Sellers'
                    description={loading ? 'Loading sellers…' : `${sellers.length} seller${sellers.length === 1 ? '' : 's'} on the platform`}
                actions={canOnboard && (
                    <Button className='h-10 cursor-pointer' onClick={() => navigate('/dashboard/sellers/onboard')}>
                        <PlusIcon /> Onboard seller
                    </Button>
                )}
            />

            <div className='flex flex-col gap-3 md:flex-row md:items-center'>
                <div className='flex flex-wrap gap-2'>
                    {FILTERS.map(f => (
                        <button key={f.value} type='button' onClick={() => setFilter(f.value)}
                            className={cn(
                                'inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                                filter === f.value ? 'border-primary bg-primary/10 text-primary' : 'bg-white text-muted-foreground hover:text-foreground'
                            )}>
                            {f.label}
                            <span className={cn('rounded-full px-1.5 text-[10px]', filter === f.value ? 'bg-primary/15' : 'bg-muted')}>{counts[f.value]}</span>
                        </button>
                    ))}
                </div>
                <div className='relative w-full md:ml-auto md:max-w-xs'>
                    <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input placeholder='Search sellers…' className='h-10 bg-white pl-9' value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <div className='mt-3'>
                <DataTable columns={columns} data={filtered} isLoading={loading} />
            </div>
            <div className='mt-3 text-xs text-muted-foreground'>Showing {filtered.length} of {sellers.length} sellers</div>

            {pending && copy && (
                <ConfirmDialog
                    open
                    onOpenChange={open => !open && setPending(null)}
                    title={copy.title(pending.seller.name)}
                    description={copy.description}
                    confirmLabel={copy.confirm}
                    destructive={copy.destructive}
                    loading={acting}
                    onConfirm={runAction}
                />
            )}
        </div>
    )
}

export default SellersPage
