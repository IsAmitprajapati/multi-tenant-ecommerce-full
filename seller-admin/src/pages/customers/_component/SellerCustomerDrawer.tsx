import { useEffect, useState } from 'react'
import moment from 'moment'
import { ChevronLeftIcon, ChevronRightIcon, LockIcon, PackageIcon, ReceiptTextIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { sellerCustomersApi, type Paged, type SellerCustomer, type SellerCustomerOrder } from '@/api/customers'
import { formatINR, initials } from './customer-format'

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className='rounded-xl border bg-white p-3.5'>
            <div className='text-[11.5px] text-muted-foreground'>{label}</div>
            <div className='mt-1 text-lg font-bold tabular-nums'>{value}</div>
        </div>
    )
}

function OrderCard({ o }: { o: SellerCustomerOrder }) {
    return (
        <div className='rounded-xl border bg-white'>
            <div className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3'>
                <div>
                    <div className='text-[13px] font-bold'>{o.number}</div>
                    <div className='text-xs text-muted-foreground'>{moment(o.createdAt).format('D MMM YYYY, h:mm a')}</div>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                    <span className='rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary'>{o.status}</span>
                    <span className='rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground'>{o.paymentStatus}{o.paymentMethod ? ` · ${o.paymentMethod}` : ''}</span>
                </div>
            </div>
            <div className='divide-y px-4'>
                {o.items.map((it, i) => (
                    <div key={i} className='flex items-center gap-3 py-2.5'>
                        {it.imageUrl
                            ? <img src={it.imageUrl} alt='' className='size-10 shrink-0 rounded-md border object-cover' />
                            : <span className='flex size-10 shrink-0 items-center justify-center rounded-md border bg-muted'><PackageIcon className='size-4 text-muted-foreground' /></span>}
                        <div className='min-w-0 flex-1'>
                            <div className='truncate text-[13px] font-medium'>{it.productTitle}</div>
                            <div className='text-xs text-muted-foreground'>{it.variantName ? `${it.variantName} · ` : ''}Qty {it.quantity} × {formatINR(it.unitPrice)}</div>
                        </div>
                        <span className='text-[13px] font-semibold tabular-nums'>{formatINR(it.quantity * it.unitPrice)}</span>
                    </div>
                ))}
            </div>
            <div className='flex justify-between border-t bg-muted/30 px-4 py-2.5 text-[13px]'>
                <span className='text-muted-foreground'>Order total</span>
                <span className='font-bold tabular-nums'>{formatINR(o.total)}</span>
            </div>
        </div>
    )
}

/** Order details with this seller, paged */
function Orders({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const key = `${customerId}:${page}`
    const [result, setResult] = useState<{ key: string; data: Paged<SellerCustomerOrder> | null; error: string | null } | null>(null)

    useEffect(() => {
        let cancelled = false
        sellerCustomersApi.orders(customerId, page)
            .then(data => { if (!cancelled) setResult({ key, data, error: null }) })
            .catch(err => { if (!cancelled) setResult(r => ({ key, data: r?.data ?? null, error: getAxiosErrorMessage(err, 'Could not load orders') })) })
        return () => { cancelled = true }
    }, [customerId, page, key])

    const data = result?.data
    const loading = result?.key !== key
    if (result?.key === key && result.error) return <p className='rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive'>{result.error}</p>
    if (!data) return <div className='grid gap-3'>{[0, 1].map(i => <Skeleton key={i} className='h-40 rounded-xl' />)}</div>
    if (!data.meta.total) {
        return (
            <div className='flex flex-col items-center rounded-xl border border-dashed bg-white px-6 py-10 text-center'>
                <ReceiptTextIcon className='size-6 text-muted-foreground' />
                <p className='mt-2.5 text-sm font-semibold'>No orders yet</p>
                <p className='mt-1 max-w-sm text-xs text-muted-foreground'>Every order this customer places with your store will be listed here with its items, amount, payment and status.</p>
            </div>
        )
    }
    const pages = Math.max(1, Math.ceil(data.meta.total / data.meta.pageSize))
    return (
        <>
            <div className={cn('grid gap-3', loading && 'opacity-60')}>{data.data.map(o => <OrderCard key={o.id} o={o} />)}</div>
            <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                <span>{(data.meta.page - 1) * data.meta.pageSize + 1}–{Math.min(data.meta.total, data.meta.page * data.meta.pageSize)} of {data.meta.total} orders</span>
                {pages > 1 && (
                    <div className='flex items-center gap-1'>
                        <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page <= 1} onClick={() => setPage(page - 1)}><ChevronLeftIcon /> Prev</Button>
                        <span className='px-2 tabular-nums'>Page {page} of {pages}</span>
                        <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || page >= pages} onClick={() => setPage(page + 1)}>Next <ChevronRightIcon /></Button>
                    </div>
                )}
            </div>
        </>
    )
}

/**
 * Read-only customer details for sellers (85% wide): name, orders with this seller, total order value,
 * and the order details — nothing else about the shopper.
 */
export default function SellerCustomerDrawer({ customer: c, open, onOpenChange }: {
    customer: SellerCustomer | null
    open: boolean
    onOpenChange: (open: boolean) => void
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side='right' className='w-full gap-0 overflow-y-auto bg-(--page) p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[85vw]'>
                {!c ? (
                    <div className='p-6'>
                        <SheetHeader className='sr-only'><SheetTitle>Customer</SheetTitle><SheetDescription>Loading customer</SheetDescription></SheetHeader>
                        <div className='flex items-center gap-4'><Skeleton className='size-14 rounded-full' /><Skeleton className='h-5 w-48' /></div>
                        <div className='mt-6 grid grid-cols-2 gap-3'>{[0, 1].map(i => <Skeleton key={i} className='h-[74px] rounded-xl' />)}</div>
                    </div>
                ) : (
                    <div key={c.id} className='flex min-h-full flex-col'>
                        <div className='border-b bg-linear-to-b from-primary/10 to-white px-6 pt-6 pb-5'>
                            <SheetHeader className='p-0 pr-10'>
                                <div className='flex flex-wrap items-center gap-4'>
                                    <span className='flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary'>{initials(c.fullName)}</span>
                                    <div className='min-w-0 flex-1'>
                                        <SheetTitle className='truncate text-xl font-bold'>{c.fullName}</SheetTitle>
                                        <SheetDescription className='text-[13px]'>Customer of your store</SheetDescription>
                                    </div>
                                    <span className='inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border'>
                                        <LockIcon className='size-3' /> View only
                                    </span>
                                </div>
                            </SheetHeader>
                            <div className='mt-5 grid max-w-xl grid-cols-2 gap-3'>
                                <Stat label='Orders with you' value={c.ordersCount} />
                                <Stat label='Total order value' value={formatINR(c.totalOrderValue)} />
                            </div>
                        </div>
                        <div className='flex-1 px-6 py-5'>
                            <h3 className='mb-3 text-sm font-bold'>Order details</h3>
                            <Orders customerId={c.id} />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    )
}
