import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PencilIcon, PlusIcon, PowerIcon, SearchIcon, SlidersHorizontalIcon, XIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ListPager from '@/components/ListPager'
import { DEFAULT_PAGE_SIZE } from '@/lib/paging'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn } from '@/lib/utils'
import { catalogApi } from '@/api/catalog'
import { catalogAdminApi, type CatalogAttribute } from '@/api/catalog-admin'
import CatalogTabs from './_component/CatalogTabs'
import { ActiveBadge } from './_component/catalog-ui'

const ALL = '__all__'

function AttributeDialog({ attribute, categories, open, onOpenChange, onSaved }: {
    attribute: CatalogAttribute | null
    categories: { id: string; name: string }[]
    open: boolean
    onOpenChange: (o: boolean) => void
    onSaved: (rows: CatalogAttribute[]) => void
}) {
    const [name, setName] = useState(attribute?.name ?? '')
    const [categoryId, setCategoryId] = useState(attribute?.category?.id ?? ALL)
    const [values, setValues] = useState<string[]>(attribute?.values ?? [])
    const [draft, setDraft] = useState('')
    const [errors, setErrors] = useState<{ name?: string; values?: string }>({})
    const [saving, setSaving] = useState(false)

    const addValues = (text: string) => {
        const parts = text.split(',').map(v => v.trim()).filter(Boolean)
        if (!parts.length) return
        setValues(vs => [...vs, ...parts.filter(p => !vs.some(v => v.toLowerCase() === p.toLowerCase()))])
        setDraft('')
        setErrors(e => ({ ...e, values: undefined }))
    }

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        const finalValues = draft.trim() ? [...values, ...draft.split(',').map(v => v.trim()).filter(Boolean)] : values
        const next: typeof errors = {}
        if (!name.trim()) next.name = 'Enter a name'
        if (!finalValues.length) next.values = 'Add at least one value'
        setErrors(next)
        if (Object.keys(next).length) return
        setSaving(true)
        try {
            const payload = { name: name.trim(), values: finalValues, categoryId: categoryId === ALL ? null : categoryId }
            const res = attribute ? await catalogAdminApi.updateAttribute(attribute.id, payload) : await catalogAdminApi.createAttribute(payload)
            toast.success(res.message ?? 'Saved')
            onSaved(res.data)
            onOpenChange(false)
        } catch (err) {
            const msg = getAxiosErrorMessage(err, 'Could not save')
            if (/exists/i.test(msg)) setErrors({ name: msg })
            else toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
            <DialogContent className='sm:max-w-lg'>
                <form onSubmit={save} noValidate className='grid gap-5'>
                    <DialogHeader>
                        <DialogTitle>{attribute ? 'Edit attribute' : 'Add attribute'}</DialogTitle>
                        <DialogDescription>Attributes are the options sellers pick from when they add product variants, e.g. Size or Colour.</DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4'>
                        <div className='grid gap-1.5'>
                            <Label htmlFor='attr-name' className='text-xs font-semibold text-muted-foreground'>Attribute name</Label>
                            <Input id='attr-name' className='h-10' maxLength={40} placeholder='e.g. Size' value={name} aria-invalid={!!errors.name}
                                onChange={e => { setName(e.target.value); setErrors(x => ({ ...x, name: undefined })) }} />
                            {errors.name && <p className='text-xs text-destructive'>{errors.name}</p>}
                        </div>
                        <div className='grid gap-1.5'>
                            <Label className='text-xs font-semibold text-muted-foreground'>Used by category</Label>
                            <Select value={categoryId} onValueChange={setCategoryId}>
                                <SelectTrigger className='h-10 w-full cursor-pointer'><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL} className='cursor-pointer'>All categories</SelectItem>
                                    {categories.map(c => <SelectItem key={c.id} value={c.id} className='cursor-pointer'>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className='grid gap-1.5'>
                            <Label htmlFor='attr-values' className='text-xs font-semibold text-muted-foreground'>Values</Label>
                            <div className={cn('flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border bg-white px-2 py-1.5 focus-within:ring-2 focus-within:ring-primary/20', errors.values && 'border-destructive')}>
                                {values.map(v => (
                                    <span key={v} className='inline-flex items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2.5 text-xs font-semibold text-primary'>
                                        {v}
                                        <button type='button' aria-label={`Remove ${v}`} className='flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-primary/15'
                                            onClick={() => setValues(vs => vs.filter(x => x !== v))}><XIcon className='size-3' /></button>
                                    </span>
                                ))}
                                <input id='attr-values' value={draft} placeholder={values.length ? 'Add more…' : 'Type a value and press Enter, e.g. S, M, L'}
                                    className='min-w-[140px] flex-1 bg-transparent py-0.5 text-sm outline-none'
                                    onChange={e => { if (e.target.value.endsWith(',')) addValues(e.target.value); else setDraft(e.target.value) }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') { e.preventDefault(); addValues(draft) }
                                        else if (e.key === 'Backspace' && !draft && values.length) setValues(vs => vs.slice(0, -1))
                                    }} />
                            </div>
                            {errors.values ? <p className='text-xs text-destructive'>{errors.values}</p> : <p className='text-xs text-muted-foreground'>Press Enter or type a comma after each value.</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type='button' variant='outline' className='cursor-pointer' onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                        <Button type='submit' className='cursor-pointer' disabled={saving}>{saving && <Spinner />} {attribute ? 'Save changes' : 'Add attribute'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/** Global catalog › Attributes */
export default function AttributesPage() {
    const { can } = usePermission()
    const canEdit = can('GLOBAL_CATALOG', 'EDIT')
    const [rows, setRows] = useState<CatalogAttribute[] | null>(null)
    const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [editing, setEditing] = useState<CatalogAttribute | 'new' | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    useEffect(() => {
        catalogAdminApi.attributes().then(r => setRows(r.data)).catch(err => { toast.error(getAxiosErrorMessage(err, 'Failed to load attributes')); setRows([]) })
        catalogApi.listCategories().then(r => setCategories(r.data.map(c => ({ id: c.id, name: c.name })))).catch(() => {})
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return (rows ?? []).filter(a => !q || [a.name, a.category?.name ?? 'all categories', ...a.values].some(v => v.toLowerCase().includes(q)))
    }, [rows, search])
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

    const toggle = async (a: CatalogAttribute) => {
        setBusyId(a.id)
        try {
            const res = await catalogAdminApi.attributeStatus(a.id, !a.isActive)
            toast.success(res.message ?? 'Updated')
            setRows(res.data)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setBusyId(null)
        }
    }

    return (
        <div className='pb-10'>
            <PageHeader
                title='Global catalog'
                description='Master categories, attributes, brands, tax classes — and every product listed across the marketplace'
                actions={canEdit && <Button className='h-10 cursor-pointer' onClick={() => setEditing('new')}><PlusIcon /> Add attribute</Button>}
            >
                <CatalogTabs />
            </PageHeader>

            <div className='relative w-full md:max-w-xs'>
                <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input placeholder='Search attributes or values…' className='h-10 bg-white pl-9' value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>

            <div className='mt-4 overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Attribute</TableHead>
                            <TableHead>Values</TableHead>
                            <TableHead>Used by category</TableHead>
                            <TableHead>Status</TableHead>
                            {canEdit && <TableHead className='text-right'>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody className='bg-white'>
                        {rows === null && [0, 1, 2].map(i => (
                            <TableRow key={i}>{Array.from({ length: canEdit ? 5 : 4 }).map((_, j) => <TableCell key={j}><Skeleton className='h-4 w-24' /></TableCell>)}</TableRow>
                        ))}
                        {rows !== null && filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canEdit ? 5 : 4} className='py-14 text-center whitespace-normal'>
                                    <SlidersHorizontalIcon className='mx-auto size-6 text-muted-foreground' />
                                    <p className='mt-2 text-sm font-semibold'>{search ? 'No attributes match your search' : 'No attributes yet'}</p>
                                    <p className='mt-0.5 text-xs text-muted-foreground'>{search ? 'Try another name or value.' : 'Add Size, Colour, Storage… so sellers pick from the same options.'}</p>
                                </TableCell>
                            </TableRow>
                        )}
                        {pageRows.map(a => (
                            <TableRow key={a.id} className={cn(!a.isActive && 'opacity-60')}>
                                <TableCell className='font-semibold'>{a.name}</TableCell>
                                <TableCell className='max-w-[420px] whitespace-normal'>
                                    <div className='flex flex-wrap gap-1'>
                                        {a.values.slice(0, 8).map(v => <span key={v} className='rounded-full bg-muted px-2 py-0.5 text-xs'>{v}</span>)}
                                        {a.values.length > 8 && <span className='px-1 text-xs text-muted-foreground'>+{a.values.length - 8} more</span>}
                                    </div>
                                </TableCell>
                                <TableCell className='text-sm'>{a.category?.name ?? <span className='text-muted-foreground'>All categories</span>}</TableCell>
                                <TableCell><ActiveBadge active={a.isActive} /></TableCell>
                                {canEdit && (
                                    <TableCell className='text-right'>
                                        <div className='flex justify-end gap-1'>
                                            <Button size='sm' variant='ghost' className='cursor-pointer' onClick={() => setEditing(a)}><PencilIcon /> Edit</Button>
                                            <Button size='sm' variant='ghost' disabled={busyId === a.id}
                                                className={cn('cursor-pointer', a.isActive ? 'text-destructive hover:text-destructive' : 'text-primary')} onClick={() => toggle(a)}>
                                                {busyId === a.id ? <Spinner /> : <PowerIcon />} {a.isActive ? 'Deactivate' : 'Reactivate'}
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <ListPager page={page} pageSize={pageSize} total={filtered.length} noun='attributes' onPage={setPage} onPageSize={s => { setPageSize(s); setPage(1) }} />

            {editing && (
                <AttributeDialog key={editing === 'new' ? 'new' : editing.id} attribute={editing === 'new' ? null : editing} categories={categories}
                    open onOpenChange={o => !o && setEditing(null)} onSaved={setRows} />
            )}
        </div>
    )
}
