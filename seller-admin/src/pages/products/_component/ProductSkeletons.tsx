import { ArrowLeftIcon } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import type { ProductListItem } from '@/api/products'
import { StockPill, VisibilityPill } from './product-ui'

/** What the list already knows — passed via navigation state so the header shows instantly */
export type ProductPreview = Pick<ProductListItem, 'title' | 'imageUrl' | 'status' | 'stockStatus' | 'category'>

function SectionSkeleton({ rows, titleWidth = 'w-28' }: { rows: number; titleWidth?: string }) {
    return (
        <Card>
            <CardHeader className='border-b'><Skeleton className={`h-5 ${titleWidth}`} /></CardHeader>
            <CardContent>
                {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className='flex items-center justify-between gap-6 border-b py-3 last:border-0'>
                        <Skeleton className='h-4 w-28' />
                        <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-48' : i % 3 === 1 ? 'w-24' : 'w-36'}`} />
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}

/** Mirrors ProductViewPage: header + badges, gallery & preview on the left, sections on the right */
export function ProductViewSkeleton({ preview }: { preview?: ProductPreview | null }) {
    const navigate = useNavigate()
    return (
        <div className='pb-10' aria-busy='true' aria-label='Loading product'>
            {/* Header */}
            <div className='mb-5 lg:mb-6'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='flex items-center'>
                        <button type='button' onClick={() => navigate(-1)} aria-label='Back' className='size-12 cursor-pointer p-2'><ArrowLeftIcon className='size-full' /></button>
                        <div className='grid gap-2'>
                            {preview ? <h1 className='text-xl font-bold'>{preview.title}</h1> : <Skeleton className='h-6 w-64' />}
                            {preview
                                ? <p className='text-sm text-muted-foreground'>{preview.category.parentName ? `${preview.category.parentName} › ` : ''}{preview.category.name}</p>
                                : <Skeleton className='h-4 w-48' />}
                        </div>
                    </div>
                    <div className='flex gap-2'>
                        <Skeleton className='h-10 w-28' /><Skeleton className='h-10 w-32' />
                    </div>
                </div>
                <div className='mt-4 flex gap-2'>
                    {preview ? <><VisibilityPill status={preview.status} /><StockPill status={preview.stockStatus} /></> : <><Skeleton className='h-5 w-16 rounded-full' /><Skeleton className='h-5 w-20 rounded-full' /></>}
                </div>
            </div>

            <div className='grid gap-6 lg:grid-cols-5'>
                {/* Left */}
                <div className='grid h-fit gap-6 lg:col-span-2'>
                    <Card>
                        <CardContent>
                            {preview?.imageUrl
                                ? <img src={preview.imageUrl} alt='' className='aspect-square w-full rounded-xl object-cover' />
                                : <Skeleton className='aspect-square w-full rounded-xl' />}
                            <div className='mt-3 flex gap-2'>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='size-14 rounded-lg' />)}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className='border-b'><Skeleton className='h-5 w-48' /></CardHeader>
                        <CardContent>
                            <div className='flex gap-3 rounded-xl border p-3'>
                                <Skeleton className='size-20 shrink-0 rounded-lg' />
                                <div className='grid flex-1 content-start gap-2'><Skeleton className='h-3 w-20' /><Skeleton className='h-4 w-40' /><Skeleton className='h-4 w-16' /></div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right */}
                <div className='grid h-fit gap-6 lg:col-span-3'>
                    <SectionSkeleton rows={3} titleWidth='w-20' />
                    <Card>
                        <CardHeader className='border-b'><Skeleton className='h-5 w-40' /></CardHeader>
                        <CardContent>
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className='flex items-center justify-between gap-6 border-b py-3'>
                                    <Skeleton className='h-4 w-28' /><Skeleton className='h-4 w-24' />
                                </div>
                            ))}
                            <Skeleton className='mt-4 h-28 w-full rounded-lg' />
                        </CardContent>
                    </Card>
                    <SectionSkeleton rows={3} titleWidth='w-24' />
                    <SectionSkeleton rows={4} titleWidth='w-20' />
                    <SectionSkeleton rows={3} titleWidth='w-14' />
                </div>
            </div>
        </div>
    )
}

/** Mirrors ProductFormPage: header with actions, tab bar, first tab's card */
export function ProductFormSkeleton({ preview, isEdit }: { preview?: ProductPreview | null; isEdit: boolean }) {
    return (
        <div className='pb-10' aria-busy='true' aria-label='Loading product form'>
            <div className='mb-5 lg:mb-6'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='grid gap-2 pl-12'>
                        {preview ? <h1 className='text-xl font-bold'>{preview.title}</h1> : <Skeleton className='h-6 w-56' />}
                        <Skeleton className='h-4 w-72' />
                    </div>
                    <div className='flex gap-2'><Skeleton className='h-10 w-24' /><Skeleton className='h-10 w-20' /><Skeleton className='h-10 w-32' /></div>
                </div>
                <div className='mt-4 flex gap-1 rounded-lg bg-muted p-1'>
                    {['w-16', 'w-16', 'w-36', 'w-20', 'w-12', 'w-20'].map((w, i) => <Skeleton key={i} className={`h-8 ${w} bg-background/70`} />)}
                </div>
            </div>
            <Card>
                <CardHeader className='border-b'><Skeleton className='h-5 w-24' /><Skeleton className='mt-2 h-4 w-80' /></CardHeader>
                <CardContent className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                    {isEdit && preview?.imageUrl
                        ? <img src={preview.imageUrl} alt='' className='aspect-square w-full rounded-xl object-cover sm:col-span-2 sm:row-span-2' />
                        : <Skeleton className='aspect-square w-full rounded-xl sm:col-span-2 sm:row-span-2' />}
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className='aspect-square w-full rounded-xl' />)}
                </CardContent>
            </Card>
        </div>
    )
}
