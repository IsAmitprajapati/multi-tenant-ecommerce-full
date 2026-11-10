import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import { FolderPlusIcon, MoreHorizontalIcon, PencilIcon, PowerIcon, Trash2Icon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { catalogApi, isDeletable, type Category, type SubCategory } from '@/api/catalog'
import { ActiveBadge } from './_component/catalog-ui'
import { CATALOG_PATH } from './CategoriesPage'

const col = createColumnHelper<DataTableFeatures, SubCategory>()

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <Card size='sm'>
            <CardContent>
                <div className='text-xs font-medium text-muted-foreground'>{label}</div>
                <div className='mt-1 text-lg font-bold'>{children}</div>
            </CardContent>
        </Card>
    )
}

type Target = { type: 'status' | 'delete'; id: string; name: string; isActive: boolean; isSub: boolean }

export default function CategoryDetailPage() {
    const { categoryId } = useParams<{ categoryId: string }>()
    const navigate = useNavigate()
    const { can } = usePermission()
    const canEdit = can('GLOBAL_CATALOG', 'EDIT')
    const canDelete = can('GLOBAL_CATALOG', 'MANAGE')

    const [cat, setCat] = useState<Category | null>(null)
    const [confirm, setConfirm] = useState<Target | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(() => {
        catalogApi.listCategories()
            .then(r => {
                const c = r.data.find(x => x.id === categoryId)
                if (!c) { toast.error('Category not found'); navigate(CATALOG_PATH, { replace: true }); return }
                setCat(c)
            })
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load category')))
    }, [categoryId, navigate])
    useEffect(() => { load() }, [load])

    const runConfirm = async () => {
        if (!confirm) return
        setBusy(true)
        try {
            const res = confirm.type === 'delete' ? await catalogApi.deleteCategory(confirm.id) : await catalogApi.setCategoryStatus(confirm.id, !confirm.isActive)
            toast.success(res.message ?? 'Updated')
            setConfirm(null)
            if (confirm.type === 'delete' && !confirm.isSub) navigate(CATALOG_PATH, { replace: true })
            else load()
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Something went wrong'))
        } finally { setBusy(false) }
    }

    if (!cat) {
        return (
            <div>
                <Skeleton className='mb-6 h-14 w-80' />
                <div className='grid gap-4 sm:grid-cols-4'>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-20' />)}</div>
                <Skeleton className='mt-6 h-80' />
            </div>
        )
    }

    const columns = col.columns([
        col.accessor('name', {
            header: 'Sub-category',
            cell: ({ row }) => (
                <div>
                    <div className='font-semibold'>{row.original.name}</div>
                    {row.original.description && <div className='max-w-md truncate text-xs text-muted-foreground'>{row.original.description}</div>}
                </div>
            ),
        }),
        col.accessor('productsCount', { header: 'Products', cell: ({ row }) => <span className='tabular-nums'>{row.original.productsCount}</span> }),
        col.accessor('isActive', { header: 'Status', cell: ({ row }) => <ActiveBadge active={row.original.isActive} /> }),
        col.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const s = row.original
                if (!canEdit) return null
                return (
                    <div className='flex justify-end'>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${s.name}`}><MoreHorizontalIcon /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' className='w-48'>
                                <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`${CATALOG_PATH}/${s.id}/edit`)}><PencilIcon /> Edit</DropdownMenuItem>
                                <DropdownMenuItem className='cursor-pointer' onSelect={() => setConfirm({ type: 'status', id: s.id, name: s.name, isActive: s.isActive, isSub: true })}>
                                    <PowerIcon /> {s.isActive ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                {canDelete && (
                                    <>
                                        <DropdownMenuSeparator />
                                        {isDeletable(s)
                                            ? <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setConfirm({ type: 'delete', id: s.id, name: s.name, isActive: s.isActive, isSub: true })}><Trash2Icon /> Delete</DropdownMenuItem>
                                            : <p className='px-2 py-1.5 text-[11px] leading-snug text-muted-foreground'>Has products — can’t be deleted. Deactivate it instead.</p>}
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        }),
    ])

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={cat.name}
                description={cat.description ?? 'Top-level category'}
                actions={canEdit && (
                    <>
                        {canDelete && isDeletable(cat) && (
                            <Button variant='ghost' className='h-10 cursor-pointer text-destructive' onClick={() => setConfirm({ type: 'delete', id: cat.id, name: cat.name, isActive: cat.isActive, isSub: false })}><Trash2Icon /> Delete</Button>
                        )}
                        <Button variant='outline' className='h-10 cursor-pointer' onClick={() => setConfirm({ type: 'status', id: cat.id, name: cat.name, isActive: cat.isActive, isSub: false })}>
                            <PowerIcon /> {cat.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(`${CATALOG_PATH}/${cat.id}/edit`)}><PencilIcon /> Edit</Button>
                    </>
                )}
            >
                <ActiveBadge active={cat.isActive} />
            </PageHeader>

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Stat label='Default commission'>{cat.defaultCommissionRate ?? '—'}%</Stat>
                <Stat label='FSSAI license'>{cat.requiresFssai ? 'Required' : 'Not required'}</Stat>
                <Stat label='Sellers'>{cat.sellersCount}</Stat>
                <Stat label='Products'>{cat.productsCount}</Stat>
            </div>

            <Card className='mt-6'>
                <CardHeader className='border-b'>
                    <div className='flex items-start justify-between gap-3'>
                        <div>
                            <CardTitle className='text-base font-semibold'>Sub-categories</CardTitle>
                            <CardDescription className='mt-1'>Sellers in {cat.name} file each product under one of these.</CardDescription>
                        </div>
                        {canEdit && <Button className='cursor-pointer' onClick={() => navigate(`${CATALOG_PATH}/new?parent=${cat.id}`)}><FolderPlusIcon /> Add sub-category</Button>}
                    </div>
                </CardHeader>
                <CardContent>
                    {cat.children.length === 0
                        ? <p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>No sub-categories yet — sellers can’t add products in {cat.name} until you add one.</p>
                        : <DataTable columns={columns} data={cat.children} pageSize={20} />}
                </CardContent>
            </Card>

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={o => !o && setConfirm(null)}
                    title={confirm.type === 'delete' ? `Delete “${confirm.name}”?` : `${confirm.isActive ? 'Deactivate' : 'Activate'} “${confirm.name}”?`}
                    description={confirm.type === 'delete'
                        ? 'This permanently removes it. This can’t be undone.'
                        : confirm.isActive
                            ? confirm.isSub ? 'Sellers won’t be able to file new products under it. Existing products keep it.' : 'New sellers won’t be able to choose it. Existing sellers and products keep it.'
                            : 'It can be chosen again.'}
                    confirmLabel={confirm.type === 'delete' ? 'Delete' : confirm.isActive ? 'Deactivate' : 'Activate'}
                    destructive={confirm.type === 'delete' || confirm.isActive}
                    loading={busy}
                    onConfirm={runConfirm}
                />
            )}
        </div>
    )
}
