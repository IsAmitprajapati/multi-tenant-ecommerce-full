import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import moment from 'moment'
import {
    AlertTriangleIcon, ArrowRightIcon, CheckCircle2Icon, CircleIcon, CopyIcon, ExternalLinkIcon, IndianRupeeIcon,
    PackageIcon, ShoppingBagIcon, TruckIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import PageHeader from '@/components/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppSelector } from '@/hooks/use-store'
import { displayUrl } from '@/lib/utils'
import { sellerPortalApi, type SellerApplication } from '@/api/seller-portal'

function greeting() {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

function Stat({ label, value, icon: Icon, hint }: { label: string; value: string; icon: typeof PackageIcon; hint: string }) {
    return (
        <Card size='sm'>
            <CardContent className='flex items-start justify-between gap-3'>
                <div>
                    <div className='text-xs font-medium text-muted-foreground'>{label}</div>
                    <div className='mt-1.5 text-2xl font-bold'>{value}</div>
                    <div className='mt-0.5 text-xs text-muted-foreground'>{hint}</div>
                </div>
                <span className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'><Icon className='size-4' /></span>
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
    const user = useAppSelector(s => s.auth.user)
    const [seller, setSeller] = useState<SellerApplication | null>(null)

    useEffect(() => {
        sellerPortalApi.getApplication().then(res => setSeller(res.data)).catch(() => undefined)
    }, [])

    const firstName = user?.fullName?.split(' ')[0] ?? ''
    const sellerName = user?.seller?.name ?? seller?.name ?? 'your business'

    const checklist = [
        { done: true, label: 'Seller account approved', to: '/dashboard/settings' },
        { done: Boolean(seller?.logoUrl), label: 'Upload your logo', to: '/dashboard/settings' },
        { done: false, label: 'Add your first product', to: '/dashboard/products' },
        { done: false, label: 'Set delivery fees & slots', to: '/dashboard/delivery' },
        { done: false, label: 'Invite your staff', to: '/dashboard/staff' },
    ]
    const doneCount = checklist.filter(c => c.done).length

    return (
        <div className='pb-10'>
            <PageHeader title={`${greeting()}, ${firstName}`} description={`Here’s how ${sellerName} is doing today`} />

            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Stat label='Orders today' value='0' icon={ShoppingBagIcon} hint='No orders yet' />
                <Stat label='Revenue today' value='₹0' icon={IndianRupeeIcon} hint='After commission' />
                <Stat label='Pending fulfilment' value='0' icon={TruckIcon} hint='New, packing or ready' />
                <Stat label='Low stock alerts' value='0' icon={AlertTriangleIcon} hint='Below threshold' />
            </div>

            <div className='mt-6 grid gap-6 lg:grid-cols-3'>
                <Card className='lg:col-span-2'>
                    <CardHeader className='border-b'>
                        <CardTitle className='text-base font-semibold'>Get ready to sell</CardTitle>
                        <CardDescription>{doneCount} of {checklist.length} done — finish these to start receiving orders.</CardDescription>
                    </CardHeader>
                    <CardContent className='p-0'>
                        <div className='px-5 pt-3'>
                            <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
                                <div className='h-full rounded-full bg-primary transition-[width]' style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                            </div>
                        </div>
                        <ul className='divide-y'>
                            {checklist.map(c => (
                                <li key={c.label}>
                                    <Link to={c.to} className='flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40'>
                                        {c.done ? <CheckCircle2Icon className='size-5 text-primary' /> : <CircleIcon className='size-5 text-muted-foreground' />}
                                        <span className={c.done ? 'text-sm text-muted-foreground line-through' : 'text-sm font-medium'}>{c.label}</span>
                                        {!c.done && <ArrowRightIcon className='ml-auto size-4 text-muted-foreground' />}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className='border-b'>
                        <CardTitle className='text-base font-semibold'>Your seller page</CardTitle>
                        <CardDescription>Customers find you here on the marketplace.</CardDescription>
                    </CardHeader>
                    <CardContent className='grid gap-4'>
                        {!seller ? <Skeleton className='h-24' /> : (
                            <>
                                <div className='flex items-center gap-3'>
                                    {seller.logoUrl
                                        ? <img src={seller.logoUrl} alt='' className='size-12 rounded-xl border object-cover' />
                                        : <span className='flex size-12 items-center justify-center rounded-xl text-lg font-bold text-white' style={{ background: seller.brandColor }}>{seller.name[0]?.toUpperCase()}</span>}
                                    <div className='min-w-0'>
                                        <div className='truncate font-semibold'>{seller.name}</div>
                                        <div className='text-xs text-muted-foreground'>{seller.categoryLabel} · {seller.commissionRate}% commission</div>
                                    </div>
                                </div>
                                <div className='flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs'>
                                    <span className='min-w-0 flex-1 truncate'>{displayUrl(seller.publicUrl)}</span>
                                    <button type='button' aria-label='Copy page URL' className='cursor-pointer text-muted-foreground hover:text-foreground'
                                        onClick={() => navigator.clipboard?.writeText(seller.publicUrl).then(() => toast.success('Copied'))}>
                                        <CopyIcon className='size-3.5' />
                                    </button>
                                </div>
                                <Button asChild variant='outline' className='h-10'>
                                    <a href={seller.publicUrl} target='_blank' rel='noopener noreferrer'><ExternalLinkIcon /> View my page</a>
                                </Button>
                                <p className='text-xs text-muted-foreground'>Selling since {moment(seller.createdAt).format('D MMM YYYY')}</p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
