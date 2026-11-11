import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { LayoutGridIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { catalogApi, type CategoryDetail } from '@/api/catalog'
import { CATALOG_PATH } from './CategoriesPage'
import CategoryImageField, { type CategoryImage } from './_component/CategoryImageField'

/**
 *   /categories/new                 → new top-level category
 *   /categories/new?parent=<id>     → new sub-category under <id>
 *   /categories/:categoryId/edit    → edit either
 */
export default function CategoryFormPage() {
    const { categoryId } = useParams<{ categoryId: string }>()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const parentIdParam = params.get('parent')

    const [existing, setExisting] = useState<CategoryDetail | null>(null)
    const [parent, setParent] = useState<{ id: string; name: string } | null>(null)
    const [loading, setLoading] = useState(Boolean(categoryId || parentIdParam))
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [form, setForm] = useState({ name: '', description: '', defaultCommissionRate: '10', requiresFssai: false, isActive: true })
    const [image, setImage] = useState<CategoryImage | null>(null)
    const [icon, setIcon] = useState<CategoryImage | null>(null)

    useEffect(() => {
        const load = async () => {
            try {
                if (categoryId) {
                    const c = (await catalogApi.getCategory(categoryId)).data
                    setExisting(c)
                    setParent(c.parent)
                    setForm({ name: c.name, description: c.description ?? '', defaultCommissionRate: String(c.defaultCommissionRate ?? 10), requiresFssai: c.requiresFssai, isActive: c.isActive })
                    setImage(c.imageFileId && c.imageUrl ? { fileId: c.imageFileId, url: c.imageUrl } : null)
                    setIcon(c.iconFileId && c.iconUrl ? { fileId: c.iconFileId, url: c.iconUrl } : null)
                } else if (parentIdParam) {
                    const p = (await catalogApi.getCategory(parentIdParam)).data
                    if (p.parentId) throw new Error('Sub-categories can’t have their own sub-categories')
                    setParent({ id: p.id, name: p.name })
                }
            } catch (err) {
                toast.error(getAxiosErrorMessage(err, (err as Error).message || 'Category not found'))
                navigate(CATALOG_PATH, { replace: true })
            } finally { setLoading(false) }
        }
        load()
    }, [categoryId, parentIdParam, navigate])

    const isSub = Boolean(parent)
    const isEdit = Boolean(existing)
    const backTo = isSub ? `${CATALOG_PATH}/${parent!.id}` : existing ? `${CATALOG_PATH}/${existing.id}` : CATALOG_PATH
    const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

    const save = async () => {
        const e: Record<string, string> = {}
        if (form.name.trim().length < 2) e.name = 'Enter a name (at least 2 characters)'
        const rate = Number(form.defaultCommissionRate)
        if (!isSub && (form.defaultCommissionRate === '' || Number.isNaN(rate) || rate < 0 || rate > 50)) e.defaultCommissionRate = 'Enter a rate between 0 and 50'
        setErrors(e)
        if (Object.keys(e).length) return

        const payload = {
            name: form.name.trim(),
            description: form.description.trim(),
            isActive: form.isActive,
            imageFileId: image?.fileId ?? null,
            iconFileId: icon?.fileId ?? null,
            ...(!isSub && { defaultCommissionRate: rate, requiresFssai: form.requiresFssai }),
        }
        setSaving(true)
        try {
            const res = existing
                ? await catalogApi.updateCategory(existing.id, payload)
                : await catalogApi.createCategory({ ...payload, ...(parent && { parentId: parent.id }) })
            toast.success(res.message ?? 'Saved')
            navigate(isSub ? `${CATALOG_PATH}/${parent!.id}` : `${CATALOG_PATH}/${res.data.id}`)
        } catch (err) {
            const message = getAxiosErrorMessage(err, 'Could not save')
            if (isAxiosError<{ field?: string }>(err) && err.response?.data?.field === 'name') setErrors({ name: message })
            toast.error(message)
        } finally { setSaving(false) }
    }

    const title = isEdit ? `Edit ${isSub ? 'sub-category' : 'category'}` : isSub ? `Add sub-category to ${parent?.name}` : 'Add category'

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={loading ? 'Loading…' : title}
                description={isSub
                    ? `Sellers in ${parent?.name ?? 'this category'} file products under sub-categories.`
                    : 'Sellers choose categories at onboarding. Commission and FSSAI rules apply to sellers in this category.'}
                actions={(
                    <>
                        <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(backTo)} disabled={saving}>Cancel</Button>
                        <Button className='h-10 min-w-28 cursor-pointer' onClick={save} disabled={saving || loading}>{saving && <Spinner />} Save</Button>
                    </>
                )}
            />

            {loading ? <Skeleton className='h-96 max-w-2xl' /> : (
                <Card className='max-w-2xl'>
                    <CardHeader className='border-b'>
                        <CardTitle className='flex items-center gap-2 text-base font-semibold'><LayoutGridIcon className='size-4 text-primary' /> {isSub ? 'Sub-category' : 'Category'} details</CardTitle>
                        {isSub && <CardDescription>Under <b className='text-foreground'>{parent?.name}</b></CardDescription>}
                    </CardHeader>
                    <CardContent className='grid gap-5'>
                        <div className='grid gap-1.5'>
                            <Label htmlFor='name' className='text-xs font-semibold text-muted-foreground'>Name</Label>
                            <Input id='name' className='h-10' maxLength={80} placeholder={isSub ? 'e.g. Fruits' : 'e.g. Grocery & food'} value={form.name}
                                aria-invalid={!!errors.name} onChange={e => set('name', e.target.value)} autoFocus />
                            {errors.name && <p className='text-xs text-destructive'>{errors.name}</p>}
                        </div>
                        <div className='grid gap-1.5'>
                            <Label className='text-xs font-semibold text-muted-foreground'>Icon <span className='font-normal'>(optional)</span></Label>
                            <CategoryImageField kind='icon' value={icon} onChange={setIcon} disabled={saving} />
                        </div>
                        <div className='grid gap-1.5'>
                            <Label className='text-xs font-semibold text-muted-foreground'>Image <span className='font-normal'>(optional)</span></Label>
                            <CategoryImageField kind='image' value={image} onChange={setImage} disabled={saving} />
                        </div>
                        <div className='grid gap-1.5'>
                            <Label htmlFor='description' className='text-xs font-semibold text-muted-foreground'>Description <span className='font-normal'>(optional)</span></Label>
                            <Textarea id='description' rows={3} maxLength={300} placeholder={isSub ? 'What goes in here' : 'Shown to sellers when they choose categories'}
                                value={form.description} onChange={e => set('description', e.target.value)} />
                        </div>
                        {!isSub && (
                            <>
                                <div className='grid gap-1.5 sm:max-w-xs'>
                                    <Label htmlFor='rate' className='text-xs font-semibold text-muted-foreground'>Default commission (%)</Label>
                                    <Input id='rate' type='number' min={0} max={50} step='0.5' className='h-10' value={form.defaultCommissionRate}
                                        aria-invalid={!!errors.defaultCommissionRate} onChange={e => set('defaultCommissionRate', e.target.value)} />
                                    {errors.defaultCommissionRate
                                        ? <p className='text-xs text-destructive'>{errors.defaultCommissionRate}</p>
                                        : <p className='text-xs text-muted-foreground'>Applied to new sellers. Sellers in several categories get the highest rate. Existing sellers aren’t changed.</p>}
                                </div>
                                <label className='flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3'>
                                    <span>
                                        <span className='block text-sm font-semibold'>Requires FSSAI license</span>
                                        <span className='block text-xs text-muted-foreground'>Sellers choosing this category must upload an FSSAI license (food items).</span>
                                    </span>
                                    <Switch checked={form.requiresFssai} onCheckedChange={v => set('requiresFssai', v)} />
                                </label>
                            </>
                        )}
                        <label className='flex cursor-pointer items-start justify-between gap-4 rounded-lg border p-3'>
                            <span>
                                <span className='block text-sm font-semibold'>Active</span>
                                <span className='block text-xs text-muted-foreground'>{isSub ? 'Inactive sub-categories can’t be chosen for new products.' : 'Inactive categories can’t be chosen by new sellers.'}</span>
                            </span>
                            <Switch checked={form.isActive} onCheckedChange={v => set('isActive', v)} />
                        </label>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
