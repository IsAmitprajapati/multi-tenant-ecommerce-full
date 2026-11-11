import { useState } from 'react'
import moment from 'moment'
import {
    BellIcon, ChevronLeftIcon, ChevronRightIcon, CreditCardIcon, ExternalLinkIcon, HeartIcon, LaptopIcon, MapPinIcon, MonitorSmartphoneIcon,
    PackageIcon, ReceiptTextIcon, ShoppingCartIcon, SmartphoneIcon, StarIcon, type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CUSTOMER_STORE_URL } from '@/api/storefront'
import {
    customerApi, type CustomerCartLine, type CustomerProductRef, type ICustomerAddress, type ICustomerDetail, type PageMeta,
} from '@/api/customer'
import { formatINR } from './customer-format'
import { useCustomerResource, usePagedHistory } from './use-customer-data'

// ───────────── shared bits ─────────────

const productUrl = (p: CustomerProductRef) => `${CUSTOMER_STORE_URL}/p/${p.seller.slug}/${p.slug}`

export function Pager({ meta, onPage, loading, noun }: { meta: PageMeta; onPage: (p: number) => void; loading?: boolean; noun: string }) {
    if (meta.total === 0) return null
    const pages = Math.max(1, Math.ceil(meta.total / meta.pageSize))
    const from = (meta.page - 1) * meta.pageSize + 1
    const to = Math.min(meta.total, meta.page * meta.pageSize)
    return (
        <div className='mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
            <span>{from}–{to} of {meta.total.toLocaleString('en-IN')} {noun}</span>
            {pages > 1 && (
                <div className='flex items-center gap-1'>
                    <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
                        <ChevronLeftIcon /> Prev
                    </Button>
                    <span className='px-2 tabular-nums'>Page {meta.page} of {pages}</span>
                    <Button variant='outline' size='sm' className='cursor-pointer bg-white' disabled={loading || meta.page >= pages} onClick={() => onPage(meta.page + 1)}>
                        Next <ChevronRightIcon />
                    </Button>
                </div>
            )}
        </div>
    )
}

function EmptyState({ Icon, title, text }: { Icon: LucideIcon; title: string; text: string }) {
    return (
        <div className='flex flex-col items-center rounded-xl border border-dashed bg-white px-6 py-10 text-center'>
            <Icon className='size-6 text-muted-foreground' />
            <p className='mt-2.5 text-sm font-semibold'>{title}</p>
            <p className='mt-1 max-w-sm text-xs text-muted-foreground'>{text}</p>
        </div>
    )
}

function ListSkeleton({ rows = 4 }: { rows?: number }) {
    return <div className='grid gap-2.5'>{Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className='h-16 rounded-xl' />)}</div>
}

function ErrorNote({ text }: { text: string }) {
    return <p className='rounded-lg bg-destructive/5 px-3 py-2 text-xs text-destructive'>{text}</p>
}

function Thumb({ url, className }: { url: string | null; className?: string }) {
    return url
        ? <img src={url} alt='' className={cn('size-14 shrink-0 rounded-lg border bg-muted object-cover', className)} />
        : <span className={cn('flex size-14 shrink-0 items-center justify-center rounded-lg border bg-muted', className)}><PackageIcon className='size-5 text-muted-foreground' /></span>
}

function ProductTitle({ p }: { p: CustomerProductRef }) {
    return (
        <a href={productUrl(p)} target='_blank' rel='noreferrer' className='group inline-flex max-w-full items-center gap-1 text-[13px] font-semibold hover:text-primary'>
            <span className='truncate'>{p.title}</span>
            <ExternalLinkIcon className='size-3 shrink-0 opacity-0 group-hover:opacity-100' />
        </a>
    )
}

const Price = ({ price, mrp }: { price: number; mrp: number | null }) => (
    <span className='tabular-nums'>
        <span className='font-semibold'>{formatINR(price)}</span>
        {mrp != null && mrp > price && <span className='ml-1.5 text-xs text-muted-foreground line-through'>{formatINR(mrp)}</span>}
    </span>
)

const Badge = ({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'good' | 'warn' | 'bad' }) => (
    <span className={cn('inline-flex w-fit items-center rounded-full px-2 py-px text-[10.5px] font-semibold', {
        muted: 'bg-muted text-muted-foreground', good: 'bg-primary/10 text-primary', warn: 'bg-amber-100 text-amber-800', bad: 'bg-destructive/10 text-destructive',
    }[tone])}>{children}</span>
)

// ───────────── Orders / Payments (filled by checkout) ─────────────

export function OrdersTab({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const { data, loading, error } = usePagedHistory(customerId, customerApi.orders, page)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton />
    if (!data.meta.total) return <EmptyState Icon={ReceiptTextIcon} title='No orders yet' text='Every order this customer places, from any store, will be listed here with its status, items and amount once checkout is live.' />
    return (
        <>
            <div className='overflow-hidden rounded-xl border bg-white'>
                {data.data.map(o => (
                    <div key={o.id} className='flex items-center justify-between gap-4 border-t px-4 py-3 first:border-t-0'>
                        <div><div className='text-[13px] font-semibold'>{o.number}</div><div className='text-xs text-muted-foreground'>{o.storeName} · {o.itemsCount} item{o.itemsCount === 1 ? '' : 's'} · {moment(o.createdAt).format('D MMM YYYY')}</div></div>
                        <div className='text-right'><div className='text-[13px] font-semibold tabular-nums'>{formatINR(o.total)}</div><Badge>{o.status}</Badge></div>
                    </div>
                ))}
            </div>
            <Pager meta={data.meta} onPage={setPage} loading={loading} noun='orders' />
        </>
    )
}

export function PaymentsTab({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const { data, loading, error } = usePagedHistory(customerId, customerApi.payments, page)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton />
    if (!data.meta.total) return <EmptyState Icon={CreditCardIcon} title='No payments yet' text='Payments and refunds (method, amount, status and gateway reference) will appear here once the payment gateway is connected at checkout.' />
    return (
        <>
            <div className='overflow-hidden rounded-xl border bg-white'>
                {data.data.map(p => (
                    <div key={p.id} className='flex items-center justify-between gap-4 border-t px-4 py-3 first:border-t-0'>
                        <div><div className='text-[13px] font-semibold'>{p.orderNumber} · {p.method}</div><div className='text-xs text-muted-foreground'>{moment(p.createdAt).format('D MMM YYYY, h:mm a')}{p.reference ? ` · ${p.reference}` : ''}</div></div>
                        <div className='text-right'><div className='text-[13px] font-semibold tabular-nums'>{formatINR(p.amount)}</div><Badge>{p.status}</Badge></div>
                    </div>
                ))}
            </div>
            <Pager meta={data.meta} onPage={setPage} loading={loading} noun='payments' />
        </>
    )
}

// ───────────── Cart ─────────────

function CartLine({ l }: { l: CustomerCartLine }) {
    return (
        <div className='flex items-center gap-3.5 border-t px-4 py-3 first:border-t-0'>
            <Thumb url={l.product.imageUrl} />
            <div className='min-w-0 flex-1'>
                <ProductTitle p={l.product} />
                <div className='truncate text-xs text-muted-foreground'>
                    {l.product.seller.name}{l.variantName ? ` · ${l.variantName}` : ''} · added {moment(l.addedAt).fromNow()}
                </div>
                <div className='mt-1 flex flex-wrap gap-1.5'>
                    {l.state === 'UNAVAILABLE' && <Badge tone='bad'>No longer available</Badge>}
                    {l.state === 'OUT_OF_STOCK' && <Badge tone='warn'>Out of stock</Badge>}
                    {l.state === 'OK' && l.stock <= 5 && <Badge tone='warn'>Only {l.stock} left</Badge>}
                </div>
            </div>
            <div className='shrink-0 text-right text-[13px]'>
                <Price price={l.unitPrice} mrp={l.mrp} />
                <div className='mt-0.5 text-xs text-muted-foreground'>Qty {l.quantity}{l.quantity > 1 && <> · <span className='font-semibold text-foreground'>{formatINR(l.lineTotal)}</span></>}</div>
            </div>
        </div>
    )
}

export function CartTab({ customerId }: { customerId: string }) {
    const { data, error } = useCustomerResource(customerId, customerApi.cart)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton rows={3} />
    if (!data.items.length && !data.savedForLater.length) {
        return <EmptyState Icon={ShoppingCartIcon} title='Cart is empty' text='Products the customer adds to their cart show here with live prices and stock.' />
    }
    const s = data.summary
    return (
        <div className='grid gap-5'>
            <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
                {[
                    ['Items', `${s.units} (${s.lines} line${s.lines === 1 ? '' : 's'})`],
                    ['Cart value', formatINR(s.subtotal)],
                    ['Savings', formatINR(s.savings)],
                    ['From sellers', String(s.sellers)],
                ].map(([k, v]) => (
                    <div key={k} className='rounded-xl border bg-white p-3'><div className='text-[11.5px] text-muted-foreground'>{k}</div><div className='mt-0.5 text-base font-bold tabular-nums'>{v}</div></div>
                ))}
            </div>
            {data.items.length > 0 && (
                <div>
                    <h4 className='mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase'>In cart</h4>
                    <div className='overflow-hidden rounded-xl border bg-white'>{data.items.map(l => <CartLine key={l.id} l={l} />)}</div>
                    <p className='mt-2 text-xs text-muted-foreground'>Prices are live. Cart value counts only items that can be bought now (taxes included, delivery not included).</p>
                </div>
            )}
            {data.savedForLater.length > 0 && (
                <div>
                    <h4 className='mb-2 text-xs font-bold tracking-wide text-muted-foreground uppercase'>Saved for later ({data.savedForLater.length})</h4>
                    <div className='overflow-hidden rounded-xl border bg-white'>{data.savedForLater.map(l => <CartLine key={l.id} l={l} />)}</div>
                </div>
            )}
        </div>
    )
}

// ───────────── Wishlist ─────────────

export function WishlistTab({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const { data, loading, error } = usePagedHistory(customerId, customerApi.wishlist, page)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton />
    if (!data.meta.total) return <EmptyState Icon={HeartIcon} title='Wishlist is empty' text='Products the customer saves with the heart button show here.' />
    return (
        <>
            <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', loading && 'opacity-60')}>
                {data.data.map(w => (
                    <div key={w.id} className='flex gap-3 rounded-xl border bg-white p-3'>
                        <Thumb url={w.product.imageUrl} />
                        <div className='min-w-0 flex-1'>
                            <ProductTitle p={w.product} />
                            <div className='truncate text-xs text-muted-foreground'>{w.product.seller.name}</div>
                            <div className='mt-1 text-[13px]'>{w.product.hasVariants && <span className='text-xs text-muted-foreground'>from </span>}<Price price={w.price} mrp={w.mrp} /></div>
                            <div className='mt-1 flex flex-wrap items-center gap-1.5'>
                                {!w.product.available ? <Badge tone='bad'>Unavailable</Badge> : w.inStock ? <Badge tone='good'>In stock</Badge> : <Badge tone='warn'>Out of stock</Badge>}
                                <span className='text-[11px] text-muted-foreground'>Saved {moment(w.addedAt).fromNow()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <Pager meta={data.meta} onPage={setPage} loading={loading} noun='saved items' />
        </>
    )
}

// ───────────── Addresses ─────────────

export function AddressCard({ a }: { a: ICustomerAddress }) {
    return (
        <div className='rounded-xl border bg-white p-4'>
            <div className='flex items-center gap-2'>
                <MapPinIcon className='size-4 text-muted-foreground' />
                <span className='text-[13px] font-semibold'>{a.label}</span>
                {a.isDefault && <Badge tone='good'>Default</Badge>}
            </div>
            <div className='mt-2 text-[13px] font-medium'>{a.fullName}</div>
            <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>
                {a.line1}, {a.locality}{a.landmark ? `, near ${a.landmark}` : ''}<br />
                {a.city}, {a.state} – {a.pincode}<br />
                Phone: {a.phone}
            </p>
        </div>
    )
}

export function AddressesTab({ customer }: { customer: ICustomerDetail }) {
    if (!customer.addresses.length) return <EmptyState Icon={MapPinIcon} title='No saved addresses' text='Delivery addresses the customer saves in My account show here.' />
    return <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>{customer.addresses.map(a => <AddressCard key={a.id} a={a} />)}</div>
}

// ───────────── Reviews ─────────────

export function ReviewsTab({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const { data, loading, error } = usePagedHistory(customerId, customerApi.reviews, page)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton />
    if (!data.meta.total) return <EmptyState Icon={StarIcon} title='No reviews written' text='Ratings and reviews this customer writes on products show here.' />
    return (
        <>
            <div className={cn('overflow-hidden rounded-xl border bg-white', loading && 'opacity-60')}>
                {data.data.map(r => (
                    <div key={r.id} className='flex gap-3.5 border-t px-4 py-3.5 first:border-t-0'>
                        <Thumb url={r.product.imageUrl} className='size-12' />
                        <div className='min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-2'>
                                <span className='inline-flex items-center gap-0.5 rounded bg-primary px-1.5 py-px text-[11px] font-bold text-white tabular-nums'>{r.rating}<StarIcon className='size-2.5 fill-current' /></span>
                                <ProductTitle p={r.product} />
                                {r.status === 'HIDDEN' && <Badge tone='warn'>Hidden</Badge>}
                            </div>
                            {r.title && <div className='mt-1 text-[13px] font-semibold'>{r.title}</div>}
                            <p className='mt-0.5 text-[13px] leading-relaxed text-muted-foreground'>{r.body}</p>
                            <div className='mt-1 text-[11px] text-muted-foreground'>{r.product.seller.name} · {moment(r.createdAt).format('D MMM YYYY')}{r.updatedAt !== r.createdAt && moment(r.updatedAt).diff(r.createdAt, 'minutes') > 1 ? ' · edited' : ''}</div>
                        </div>
                    </div>
                ))}
            </div>
            <Pager meta={data.meta} onPage={setPage} loading={loading} noun='reviews' />
        </>
    )
}

// ───────────── Activity ─────────────

const CATEGORY: Record<string, string> = { ACCOUNT: 'Account', ORDERS: 'Orders', OFFERS: 'Offers' }

export function ActivityTab({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const { data, loading, error } = usePagedHistory(customerId, customerApi.activity, page)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton />
    if (!data.meta.total) return <EmptyState Icon={BellIcon} title='No activity yet' text='Sign-up, profile and password changes, saved addresses and order updates appear here as a timeline.' />
    return (
        <>
            <ol className={cn('relative ml-2 border-l pl-5', loading && 'opacity-60')}>
                {data.data.map(a => (
                    <li key={a.id} className='relative pb-4 last:pb-0'>
                        <span className='absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-white bg-primary ring-1 ring-primary/30' />
                        <div className='flex flex-wrap items-center gap-2'>
                            <span className='text-[13px] font-semibold'>{a.title}</span>
                            <Badge>{CATEGORY[a.category] ?? a.category}</Badge>
                        </div>
                        {a.body && <p className='mt-0.5 text-xs text-muted-foreground'>{a.body}</p>}
                        <div className='mt-0.5 text-[11px] text-muted-foreground' title={moment(a.createdAt).format('D MMM YYYY, h:mm a')}>
                            {moment(a.createdAt).format('D MMM YYYY, h:mm a')} · {a.readAt ? 'seen by customer' : 'not seen yet'}
                        </div>
                    </li>
                ))}
            </ol>
            <Pager meta={data.meta} onPage={setPage} loading={loading} noun='events' />
        </>
    )
}

// ───────────── Devices ─────────────

const SESSION_BADGE = { ACTIVE: ['Signed in', 'good'], EXPIRED: ['Expired', 'muted'], SIGNED_OUT: ['Signed out', 'muted'] } as const

export function DevicesTab({ customerId }: { customerId: string }) {
    const [page, setPage] = useState(1)
    const { data, loading, error } = usePagedHistory(customerId, customerApi.sessions, page)
    if (error) return <ErrorNote text={error} />
    if (!data) return <ListSkeleton />
    if (!data.meta.total) return <EmptyState Icon={MonitorSmartphoneIcon} title='Never signed in' text='Each device the customer logs in from is listed here.' />
    return (
        <>
            <div className={cn('overflow-hidden rounded-xl border bg-white', loading && 'opacity-60')}>
                {data.data.map(s => {
                    const mobile = /mobile|android|iphone|ios/i.test(`${s.device} ${s.os}`)
                    const Icon = mobile ? SmartphoneIcon : LaptopIcon
                    const [label, tone] = SESSION_BADGE[s.state]
                    return (
                        <div key={s.id} className='flex items-center gap-3.5 border-t px-4 py-3 first:border-t-0'>
                            <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted'><Icon className='size-4 text-muted-foreground' /></span>
                            <div className='min-w-0 flex-1'>
                                <div className='truncate text-[13px] font-semibold'>{[s.browser, s.os].filter(Boolean).join(' on ') || s.deviceLabel || s.device || 'Unknown device'}{s.device && (s.browser || s.os) && <span className='font-normal text-muted-foreground'> · {s.device}</span>}</div>
                                <div className='truncate text-xs text-muted-foreground'>
                                    Signed in {moment(s.createdAt).format('D MMM YYYY, h:mm a')} · last active {moment(s.lastActiveAt).fromNow()}{s.ipAddress ? ` · IP ${s.ipAddress}` : ''}
                                </div>
                            </div>
                            <Badge tone={tone}>{label}</Badge>
                        </div>
                    )
                })}
            </div>
            <Pager meta={data.meta} onPage={setPage} loading={loading} noun='sign-ins' />
        </>
    )
}
