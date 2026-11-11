import { useState } from 'react'
import moment from 'moment'
import { MailIcon, PencilIcon, PhoneIcon, PowerIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ICustomerDetail } from '@/api/customer'
import { CustomerAvatar, CustomerStatusPill } from './customer-ui'
import { formatINR } from './customer-format'
import { ActivityTab, AddressCard, AddressesTab, CartTab, DevicesTab, OrdersTab, PaymentsTab, ReviewsTab, WishlistTab } from './CustomerTabs'

const GENDER: Record<string, string> = { MALE: 'Male', FEMALE: 'Female', OTHER: 'Other', PREFER_NOT_TO_SAY: 'Prefer not to say' }

type Tab = 'overview' | 'orders' | 'payments' | 'cart' | 'wishlist' | 'addresses' | 'reviews' | 'activity' | 'devices'

function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
    return (
        <div className='rounded-xl border bg-white p-3.5'>
            <div className='text-[11.5px] text-muted-foreground'>{label}</div>
            <div className='mt-1 text-lg font-bold tabular-nums'>{value}</div>
            {sub && <div className='text-[11px] text-muted-foreground'>{sub}</div>}
        </div>
    )
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className='flex justify-between gap-4 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0'>
            <dt className='text-xs text-muted-foreground'>{label}</dt>
            <dd className='min-w-0 text-right text-[13px] font-medium break-words'>{value}</dd>
        </div>
    )
}

function Overview({ c, goTo }: { c: ICustomerDetail; goTo: (t: Tab) => void }) {
    const defaultAddress = c.addresses.find(a => a.isDefault) ?? c.addresses[0]
    return (
        <div className='grid gap-5 lg:grid-cols-2'>
            <section>
                <h3 className='mb-2.5 text-sm font-bold'>Profile</h3>
                <dl className='rounded-xl border bg-white p-4'>
                    <Info label='Full name' value={c.fullName} />
                    <Info label='Email' value={c.email} />
                    <Info label='Phone' value={c.phone ?? '—'} />
                    <Info label='Gender' value={c.gender ? GENDER[c.gender] : '—'} />
                    <Info label='Date of birth' value={c.dateOfBirth ? moment.utc(c.dateOfBirth).format('D MMM YYYY') : '—'} />
                    <Info label='Customer since' value={moment(c.createdAt).format('D MMM YYYY, h:mm a')} />
                    <Info label='Profile last updated' value={moment(c.updatedAt).fromNow()} />
                </dl>
            </section>
            <div className='grid content-start gap-5'>
                <section>
                    <div className='mb-2.5 flex items-center justify-between'>
                        <h3 className='text-sm font-bold'>Default address</h3>
                        {c.addresses.length > 1 && <button type='button' className='cursor-pointer text-xs font-semibold text-primary' onClick={() => goTo('addresses')}>All {c.addresses.length} addresses</button>}
                    </div>
                    {defaultAddress ? <AddressCard a={defaultAddress} /> : <p className='rounded-xl border border-dashed bg-white p-4 text-xs text-muted-foreground'>No saved addresses.</p>}
                </section>
                <section>
                    <h3 className='mb-2.5 text-sm font-bold'>Account</h3>
                    <dl className='rounded-xl border bg-white p-4'>
                        <Info label='Status' value={<CustomerStatusPill status={c.status} />} />
                        <Info label='Last active' value={c.lastActiveAt ? moment(c.lastActiveAt).fromNow() : 'Never signed in'} />
                        <Info label='Signed-in devices now' value={<button type='button' className='cursor-pointer text-primary' onClick={() => goTo('devices')}>{c.activeSessions}</button>} />
                        <Info label='Reviews written' value={<button type='button' className='cursor-pointer text-primary' onClick={() => goTo('reviews')}>{c.counts.reviews}</button>} />
                    </dl>
                </section>
            </div>
        </div>
    )
}

function DrawerBody({ c, loading, canEdit, canManage, onEdit, onToggleStatus }: {
    c: ICustomerDetail; loading: boolean; canEdit: boolean; canManage: boolean
    onEdit: (c: ICustomerDetail) => void; onToggleStatus: (c: ICustomerDetail) => void
}) {
    const [tab, setTab] = useState<Tab>('overview')
    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'orders', label: 'Orders', count: c.ordersCount },
        { id: 'payments', label: 'Payments' },
        { id: 'cart', label: 'Cart', count: c.cartUnits },
        { id: 'wishlist', label: 'Wishlist', count: c.counts.wishlist },
        { id: 'addresses', label: 'Addresses', count: c.counts.addresses },
        { id: 'reviews', label: 'Reviews', count: c.counts.reviews },
        { id: 'activity', label: 'Activity', count: c.counts.activity },
        { id: 'devices', label: 'Devices', count: c.counts.sessions },
    ]

    return (
        <div className={cn('flex min-h-full flex-col transition-opacity', loading && 'opacity-70')}>
            {/* Header */}
            <div className='border-b bg-linear-to-b from-primary/10 to-white px-6 pt-6 pb-5'>
                <SheetHeader className='p-0 pr-10'>
                    <div className='flex flex-wrap items-center gap-4'>
                        <CustomerAvatar name={c.fullName} className='size-14 text-base' />
                        <div className='min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-2.5'>
                                <SheetTitle className='truncate text-xl font-bold'>{c.fullName}</SheetTitle>
                                <CustomerStatusPill status={c.status} />
                            </div>
                            <SheetDescription asChild>
                                <div className='mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]'>
                                    <span className='inline-flex items-center gap-1.5'><MailIcon className='size-3.5' />{c.email}</span>
                                    {c.phone && <span className='inline-flex items-center gap-1.5'><PhoneIcon className='size-3.5' />{c.phone}</span>}
                                    <span>Customer since {moment(c.createdAt).format('D MMM YYYY')}</span>
                                </div>
                            </SheetDescription>
                        </div>
                        <div className='flex gap-2'>
                            {canEdit && (
                                <Button size='sm' variant='outline' className='cursor-pointer bg-white' onClick={() => onEdit(c)}>
                                    <PencilIcon /> Edit
                                </Button>
                            )}
                            {canManage && (c.status === 'ACTIVE' ? (
                                <Button size='sm' variant='outline' className='cursor-pointer border-destructive/30 bg-white text-destructive hover:bg-destructive/5 hover:text-destructive' onClick={() => onToggleStatus(c)}>
                                    <PowerIcon /> Deactivate
                                </Button>
                            ) : (
                                <Button size='sm' className='cursor-pointer' onClick={() => onToggleStatus(c)}>
                                    <PowerIcon /> Reactivate
                                </Button>
                            ))}
                        </div>
                    </div>
                </SheetHeader>

                <div className='mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>
                    <Stat label='Total orders' value={c.ordersCount} />
                    <Stat label='Lifetime value' value={formatINR(c.lifetimeValue)} />
                    <Stat label='Last order' value={c.lastOrderAt ? moment(c.lastOrderAt).fromNow() : '—'} />
                    <Stat label='In cart' value={c.cartUnits} sub={`item${c.cartUnits === 1 ? '' : 's'}`} />
                    <Stat label='Wishlist' value={c.counts.wishlist} sub='saved' />
                    <Stat label='Last active' value={c.lastActiveAt ? moment(c.lastActiveAt).fromNow(true) : '—'} sub={c.lastActiveAt ? 'ago' : 'never signed in'} />
                </div>
            </div>

            {/* Tabs */}
            <div className='sticky top-0 z-10 border-b bg-white px-6'>
                <nav className='-mb-px flex gap-1 overflow-x-auto' role='tablist' aria-label='Customer details'>
                    {tabs.map(t => (
                        <button key={t.id} type='button' role='tab' aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                            className={cn('inline-flex shrink-0 cursor-pointer items-center gap-1.5 border-b-2 px-3 py-3 text-[13px] font-semibold transition-colors',
                                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                            {t.label}
                            {t.count !== undefined && <span className={cn('rounded-full px-1.5 text-[10px] tabular-nums', tab === t.id ? 'bg-primary/10' : 'bg-muted')}>{t.count}</span>}
                        </button>
                    ))}
                </nav>
            </div>

            <div className='flex-1 px-6 py-5' role='tabpanel'>
                {tab === 'overview' && <Overview c={c} goTo={setTab} />}
                {tab === 'orders' && <OrdersTab customerId={c.id} />}
                {tab === 'payments' && <PaymentsTab customerId={c.id} />}
                {tab === 'cart' && <CartTab customerId={c.id} />}
                {tab === 'wishlist' && <WishlistTab customerId={c.id} />}
                {tab === 'addresses' && <AddressesTab customer={c} />}
                {tab === 'reviews' && <ReviewsTab customerId={c.id} />}
                {tab === 'activity' && <ActivityTab customerId={c.id} />}
                {tab === 'devices' && <DevicesTab customerId={c.id} />}
            </div>
        </div>
    )
}

/**
 * Customer details (design: Admin-Customers drawer, widened to 85% of the screen):
 * header with Edit / Deactivate, order stats, and tabs for orders, payments, cart, wishlist,
 * addresses, reviews, account activity and devices — each long list is paginated.
 */
export default function CustomerDrawer({ open, customer: c, loading, onOpenChange, canEdit, canManage, onEdit, onToggleStatus }: {
    open: boolean
    /** null while the first load is in flight */
    customer: ICustomerDetail | null
    /** Re-loading (the current data stays visible, dimmed) */
    loading: boolean
    onOpenChange: (open: boolean) => void
    canEdit: boolean
    canManage: boolean
    onEdit: (c: ICustomerDetail) => void
    onToggleStatus: (c: ICustomerDetail) => void
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side='right' className='w-full gap-0 overflow-y-auto bg-(--page) p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[85vw]'>
                {!c ? (
                    <div className='p-6'>
                        <SheetHeader className='sr-only'><SheetTitle>Customer</SheetTitle><SheetDescription>Loading customer</SheetDescription></SheetHeader>
                        <div className='flex items-center gap-4'><Skeleton className='size-14 rounded-full' /><div className='grid gap-2'><Skeleton className='h-5 w-48' /><Skeleton className='h-3.5 w-72' /></div></div>
                        <div className='mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-[78px] rounded-xl' />)}</div>
                        <Skeleton className='mt-6 h-10 w-full rounded-lg' />
                        <div className='mt-5 grid gap-5 lg:grid-cols-2'><Skeleton className='h-72 rounded-xl' /><Skeleton className='h-72 rounded-xl' /></div>
                    </div>
                ) : (
                    <DrawerBody key={c.id} c={c} loading={loading} canEdit={canEdit} canManage={canManage} onEdit={onEdit} onToggleStatus={onToggleStatus} />
                )}
            </SheetContent>
        </Sheet>
    )
}
