import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { createColumnHelper } from '@tanstack/react-table'
import { EyeIcon, FolderPlusIcon, LayoutGridIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, PowerIcon, SearchIcon, Trash2Icon, ImageIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { catalogApi, isDeletable, type Category } from '@/api/catalog'
import { ActiveBadge } from './_component/catalog-ui'

const col = createColumnHelper<DataTableFeatures, Category>()
export const CATALOG_PATH = '/dashboard/global-catalog/categories'

export default function CategoriesPage() {
    const navigate = useNavigate()
    const { can } = usePermission()
    const canEdit = can('GLOBAL_CATALOG', 'EDIT')
    const canDelete = can('GLOBAL_CATALOG', 'MANAGE')

    const [items, setItems] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [confirm, setConfirm] = useState<{ type: 'status' | 'delete'; c: Category } | null>(null)
    const [busy, setBusy] = useState(false)

    const load = useCallback(() => {
        setLoading(true)
        catalogApi.listCategories()
            .then(r => setItems(r.data))
            .catch(err => toast.error(getAxiosErrorMessage(err, 'Failed to load categories')))
            .finally(() => setLoading(false))
    }, [])
    useEffect(() => { load() }, [load])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return items.filter(c => !q || c.name.toLowerCase().includes(q) || c.children.some(s => s.name.toLowerCase().includes(q)))
    }, [items, search])

    const subCount = items.reduce((n, c) => n + c.children.length, 0)

    const runConfirm = async () => {
        if (!confirm) return
        setBusy(true)
        try {
            const res = confirm.type === 'delete'
                ? await catalogApi.deleteCategory(confirm.c.id)
                : await catalogApi.setCategoryStatus(confirm.c.id, !confirm.c.isActive)
            toast.success(res.message ?? 'Updated')
            setConfirm(null)
            load()
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Something went wrong'))
        } finally { setBusy(false) }
    }

    const columns = col.columns([
        col.accessor('name', {
            header: 'Category',
            cell: ({ row }) => (
                <button type='button' onClick={() => navigate(`${CATALOG_PATH}/${row.original.id}`)} className='group flex cursor-pointer items-center gap-3 text-left'>
                    <span className='flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted'>{row.original.iconUrl ? <img src={row.original.iconUrl} alt='' className='size-6 object-contain' /> : row.original.imageUrl ? <img src={row.original.imageUrl} alt='' className='size-full object-cover' /> : <ImageIcon className='size-4 text-muted-foreground' />}</span>
                    <span className='min-w-0'>
                        <span className='block font-semibold group-hover:text-primary'>{row.original.name}</span>
                        {row.original.description && <span className='block max-w-sm truncate text-xs text-muted-foreground'>{row.original.description}</span>}
                    </span>
                </button>
            ),
        }),
        col.accessor('children', {
            header: 'Sub-categories',
            cell: ({ row }) => {
                const subs = row.original.children
                return subs.length
                    ? <div className='max-w-xs'><span className='font-semibold'>{subs.length}</span><span className='ml-1.5 truncate text-xs text-muted-foreground'>{subs.slice(0, 3).map(s => s.name).join(', ')}{subs.length > 3 ? '…' : ''}</span></div>
                    : <span className='text-xs text-amber-700'>None yet</span>
            },
        }),
        col.accessor('defaultCommissionRate', {
            header: 'Commission',
            cell: ({ row }) => <span className='tabular-nums'>{row.original.defaultCommissionRate ?? '—'}%</span>,
        }),
        col.accessor('requiresFssai', {
            header: 'FSSAI',
            cell: ({ row }) => row.original.requiresFssai
                ? <span className='rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800'>Required</span>
                : <span className='text-xs text-muted-foreground'>No</span>,
        }),
        col.accessor('sellersCount', { header: 'Sellers', cell: ({ row }) => <span className='tabular-nums'>{row.original.sellersCount}</span> }),
        col.accessor('productsCount', { header: 'Products', cell: ({ row }) => <span className='tabular-nums'>{row.original.productsCount}</span> }),
        col.accessor('isActive', { header: 'Status', cell: ({ row }) => <ActiveBadge active={row.original.isActive} /> }),
        col.display({
            id: 'actions',
            header: () => <span className='sr-only'>Actions</span>,
            cell: ({ row }) => {
                const c = row.original
                return (
                    <div className='flex items-center justify-end gap-1'>
                        <Button size='sm' variant='ghost' className='cursor-pointer text-primary' onClick={() => navigate(`${CATALOG_PATH}/${c.id}`)}><EyeIcon /> View</Button>
                        {canEdit && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant='ghost' size='icon-sm' className='cursor-pointer' aria-label={`Actions for ${c.name}`}><MoreHorizontalIcon /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align='end' className='w-52'>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`${CATALOG_PATH}/${c.id}`)}><EyeIcon /> View sub-categories</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`${CATALOG_PATH}/new?parent=${c.id}`)}><FolderPlusIcon /> Add sub-category</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => navigate(`${CATALOG_PATH}/${c.id}/edit`)}><PencilIcon /> Edit category</DropdownMenuItem>
                                    <DropdownMenuItem className='cursor-pointer' onSelect={() => setConfirm({ type: 'status', c })}>
                                        <PowerIcon /> {c.isActive ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                    {canDelete && (
                                        <>
                                            <DropdownMenuSeparator />
                                            {isDeletable(c)
                                                ? <DropdownMenuItem variant='destructive' className='cursor-pointer' onSelect={() => setConfirm({ type: 'delete', c })}><Trash2Icon /> Delete</DropdownMenuItem>
                                                : <p className='px-2 py-1.5 text-[11px] leading-snug text-muted-foreground'>In use — can’t be deleted. Deactivate it instead.</p>}
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                )
            },
        }),
    ])

    return (
        <div className='pb-10'>
            <PageHeader
                title='Global catalog'
                description={loading ? 'Loading…' : `${items.length} categories · ${subCount} sub-categories — sellers choose categories at onboarding, and file products under sub-categories`}
                actions={canEdit && <Button className='h-10 cursor-pointer' onClick={() => navigate(`${CATALOG_PATH}/new`)}><PlusIcon /> Add category</Button>}
            >
                <nav className='flex gap-6 border-b' aria-label='Global catalog sections'>
                    <span aria-current='page' className='-mb-px border-b-2 border-primary px-1 pb-2.5 text-sm font-semibold text-primary'>Categories</span>
                </nav>
            </PageHeader>

            {!loading && items.length === 0 ? (
                <Empty className='min-h-[50vh] rounded-2xl border border-dashed bg-card'>
                    <EmptyHeader>
                        <EmptyMedia variant='icon' className='bg-primary/10 text-primary'><LayoutGridIcon /></EmptyMedia>
                        <EmptyTitle>No categories yet</EmptyTitle>
                        <EmptyDescription>Add categories (e.g. Grocery & food) and their sub-categories (e.g. Fruits) so sellers can list products.</EmptyDescription>
                    </EmptyHeader>
                    {canEdit && <EmptyContent><Button className='cursor-pointer' onClick={() => navigate(`${CATALOG_PATH}/new`)}><PlusIcon /> Add category</Button></EmptyContent>}
                </Empty>
            ) : (
                <>
                    <div className='relative w-full md:max-w-xs'>
                        <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                        <Input placeholder='Search categories or sub-categories…' className='h-10 bg-white pl-9' value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className='mt-3'><DataTable columns={columns} data={filtered} isLoading={loading} /></div>
                </>
            )}

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={o => !o && setConfirm(null)}
                    title={confirm.type === 'delete' ? `Delete “${confirm.c.name}”?` : `${confirm.c.isActive ? 'Deactivate' : 'Activate'} “${confirm.c.name}”?`}
                    description={confirm.type === 'delete'
                        ? 'This permanently removes the category. This can’t be undone.'
                        : confirm.c.isActive
                            ? 'New sellers won’t be able to choose it at onboarding. Existing sellers and products keep it.'
                            : 'Sellers will be able to choose it again.'}
                    confirmLabel={confirm.type === 'delete' ? 'Delete category' : confirm.c.isActive ? 'Deactivate' : 'Activate'}
                    destructive={confirm.type === 'delete' || confirm.c.isActive}
                    loading={busy}
                    onConfirm={runConfirm}
                />
            )}
        </div>
    )
}
