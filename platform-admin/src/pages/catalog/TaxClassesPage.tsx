import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { PencilIcon, PercentIcon, PlusIcon, PowerIcon, SearchIcon } from 'lucide-react'
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
import { catalogAdminApi, GST_RATES, type TaxClass } from '@/api/catalog-admin'
import CatalogTabs from './_component/CatalogTabs'
import { ActiveBadge } from './_component/catalog-ui'

function TaxDialog({ tax, open, onOpenChange, onSaved }: {
    tax: TaxClass | null
    open: boolean
    onOpenChange: (o: boolean) => void
    onSaved: (rows: TaxClass[]) => void
}) {
    const [hsnCode, setHsn] = useState(tax?.hsnCode ?? '')
    const [description, setDescription] = useState(tax?.description ?? '')
    const [rate, setRate] = useState(String(tax?.gstRatePercent ?? 18))
    const [errors, setErrors] = useState<{ hsnCode?: string; description?: string }>({})
    const [saving, setSaving] = useState(false)
    const rateChanged = !!tax && tax.productsCount > 0 && Number(rate) !== tax.gstRatePercent

    const save = async (e: React.FormEvent) => {
        e.preventDefault()
        const next: typeof errors = {}
        if (!/^\d{4}(\d{2}){0,2}$/.test(hsnCode.trim())) next.hsnCode = 'HSN code must be 4, 6 or 8 digits'
        if (description.trim().length < 2) next.description = 'Add a short description'
        setErrors(next)
        if (Object.keys(next).length) return
        setSaving(true)
        try {
            const payload = { hsnCode: hsnCode.trim(), description: description.trim(), gstRatePercent: Number(rate) }
            const res = tax ? await catalogAdminApi.updateTaxClass(tax.id, payload) : await catalogAdminApi.createTaxClass(payload)
            toast.success(res.message ?? 'Saved')
            onSaved(res.data)
            onOpenChange(false)
        } catch (err) {
            const msg = getAxiosErrorMessage(err, 'Could not save')
            if (/exists|HSN/i.test(msg)) setErrors({ hsnCode: msg })
            else toast.error(msg)
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={o => !saving && onOpenChange(o)}>
            <DialogContent className='sm:max-w-md'>
                <form onSubmit={save} noValidate className='grid gap-5'>
                    <DialogHeader>
                        <DialogTitle>{tax ? 'Edit tax class' : 'Add tax class'}</DialogTitle>
                        <DialogDescription>Sellers pick a tax class for each product; GST on orders is worked out from its rate.</DialogDescription>
                    </DialogHeader>
                    <div className='grid gap-4'>
                        <div className='grid grid-cols-[1fr_120px] gap-3'>
                            <div className='grid gap-1.5'>
                                <Label htmlFor='hsn' className='text-xs font-semibold text-muted-foreground'>HSN code</Label>
                                <Input id='hsn' inputMode='numeric' maxLength={8} className='h-10 font-mono' placeholder='e.g. 6109' value={hsnCode} aria-invalid={!!errors.hsnCode}
                                    onChange={e => { setHsn(e.target.value.replace(/\D/g, '')); setErrors(x => ({ ...x, hsnCode: undefined })) }} />
                            </div>
                            <div className='grid gap-1.5'>
                                <Label className='text-xs font-semibold text-muted-foreground'>GST rate</Label>
                                <Select value={rate} onValueChange={setRate}>
                                    <SelectTrigger className='h-10 w-full cursor-pointer'><SelectValue /></SelectTrigger>
                                    <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)} className='cursor-pointer'>{r}%</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        {errors.hsnCode && <p className='-mt-2 text-xs text-destructive'>{errors.hsnCode}</p>}
                        <div className='grid gap-1.5'>
                            <Label htmlFor='tax-desc' className='text-xs font-semibold text-muted-foreground'>Description</Label>
                            <Input id='tax-desc' maxLength={120} className='h-10' placeholder='e.g. T-shirts, knitted' value={description} aria-invalid={!!errors.description}
                                onChange={e => { setDescription(e.target.value); setErrors(x => ({ ...x, description: undefined })) }} />
                            {errors.description && <p className='text-xs text-destructive'>{errors.description}</p>}
                        </div>
                        {rateChanged && (
                            <p className='rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800'>
                                {tax!.productsCount} product{tax!.productsCount === 1 ? ' uses' : 's use'} this class — the new rate applies to their future orders.
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type='button' variant='outline' className='cursor-pointer' onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
                        <Button type='submit' className='cursor-pointer' disabled={saving}>{saving && <Spinner />} {tax ? 'Save changes' : 'Add tax class'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}

/** Global catalog › HSN / tax classes */
export default function TaxClassesPage() {
    const { can } = usePermission()
    const canEdit = can('GLOBAL_CATALOG', 'EDIT')
    const [rows, setRows] = useState<TaxClass[] | null>(null)
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
    const [editing, setEditing] = useState<TaxClass | 'new' | null>(null)
    const [busyId, setBusyId] = useState<string | null>(null)

    useEffect(() => {
        catalogAdminApi.taxClasses().then(r => setRows(r.data)).catch(err => { toast.error(getAxiosErrorMessage(err, 'Failed to load tax classes')); setRows([]) })
    }, [])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return (rows ?? []).filter(t => !q || t.hsnCode.includes(q) || t.description.toLowerCase().includes(q) || `${t.gstRatePercent}%`.includes(q))
    }, [rows, search])
    const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

    const toggle = async (t: TaxClass) => {
        setBusyId(t.id)
        try {
            const res = await catalogAdminApi.taxClassStatus(t.id, !t.isActive)
            toast.success(res.message ?? 'Updated')
            setRows(res.data)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setBusyId(null)
        }
    }

    const cols = canEdit ? 6 : 5
    return (
        <div className='pb-10'>
            <PageHeader
                title='Global catalog'
                description='Master categories, attributes, brands, tax classes — and every product listed across the marketplace'
                actions={canEdit && <Button className='h-10 cursor-pointer' onClick={() => setEditing('new')}><PlusIcon /> Add tax class</Button>}
            >
                <CatalogTabs />
            </PageHeader>

            <div className='relative w-full md:max-w-xs'>
                <SearchIcon className='absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                <Input placeholder='Search HSN, description or rate…' className='h-10 bg-white pl-9' value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
            </div>

            <div className='mt-4 overflow-hidden rounded-md border'>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>HSN code</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className='text-right'>GST rate</TableHead>
                            <TableHead className='text-right'>Products</TableHead>
                            <TableHead>Status</TableHead>
                            {canEdit && <TableHead className='text-right'>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody className='bg-white'>
                        {rows === null && [0, 1, 2].map(i => (
                            <TableRow key={i}>{Array.from({ length: cols }).map((_, j) => <TableCell key={j}><Skeleton className='h-4 w-20' /></TableCell>)}</TableRow>
                        ))}
                        {rows !== null && filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={cols} className='py-14 text-center'>
                                    <PercentIcon className='mx-auto size-6 text-muted-foreground' />
                                    <p className='mt-2 text-sm font-semibold'>{search ? 'No tax classes match your search' : 'No tax classes yet'}</p>
                                </TableCell>
                            </TableRow>
                        )}
                        {pageRows.map(t => (
                            <TableRow key={t.id} className={cn(!t.isActive && 'opacity-60')}>
                                <TableCell className='font-mono font-semibold'>{t.hsnCode}</TableCell>
                                <TableCell className='text-sm'>{t.description}</TableCell>
                                <TableCell className='text-right'><span className='rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary tabular-nums'>{t.gstRatePercent}%</span></TableCell>
                                <TableCell className='text-right text-sm tabular-nums'>{t.productsCount}</TableCell>
                                <TableCell><ActiveBadge active={t.isActive} /></TableCell>
                                {canEdit && (
                                    <TableCell className='text-right'>
                                        <div className='flex justify-end gap-1'>
                                            <Button size='sm' variant='ghost' className='cursor-pointer' onClick={() => setEditing(t)}><PencilIcon /> Edit</Button>
                                            <Button size='sm' variant='ghost' disabled={busyId === t.id}
                                                className={cn('cursor-pointer', t.isActive ? 'text-destructive hover:text-destructive' : 'text-primary')} onClick={() => toggle(t)}>
                                                {busyId === t.id ? <Spinner /> : <PowerIcon />} {t.isActive ? 'Deactivate' : 'Reactivate'}
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <ListPager page={page} pageSize={pageSize} total={filtered.length} noun='tax classes' onPage={setPage} onPageSize={s => { setPageSize(s); setPage(1) }} />

            {editing && (
                <TaxDialog key={editing === 'new' ? 'new' : editing.id} tax={editing === 'new' ? null : editing} open onOpenChange={o => !o && setEditing(null)} onSaved={setRows} />
            )}
        </div>
    )
}
