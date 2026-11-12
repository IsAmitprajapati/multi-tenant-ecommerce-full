import { useState } from 'react'
import moment from 'moment'
import { AlertTriangleIcon, BanIcon, ExternalLinkIcon, FlagIcon, PackageIcon, PowerIcon, StarIcon } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { CUSTOMER_STORE_URL } from '@/api/storefront'
import type { PlatformProductDetail } from '@/api/catalog-admin'
import { ProductStatusPill } from './product-status'
import type { ModerationAction } from './ProductModerationDialog'

const INR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const money = (n: number) => INR.format(n)
const PACKAGE: Record<string, string> = { STANDARD_BAG: 'Standard bag', BOX: 'Box', ENVELOPE: 'Envelope', FRAGILE: 'Fragile', CUSTOM: 'Custom' }
const SCOPE: Record<string, string> = { SELLER_PINCODE_ONLY: 'Seller’s pincodes only', SPECIFIC_PINCODES: 'Specific pincodes', PAN_INDIA: 'Pan India' }

function Info({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className='flex justify-between gap-4 border-t py-2.5 first:border-t-0 first:pt-0 last:pb-0'>
            <dt className='text-xs text-muted-foreground'>{label}</dt>
            <dd className='min-w-0 text-right text-[13px] font-medium break-words'>{value}</dd>
        </div>
    )
}

function Body({ p, canFlag, canBlock, onAction }: { p: PlatformProductDetail; canFlag: boolean; canBlock: boolean; onAction: (a: ModerationAction) => void }) {
    const [img, setImg] = useState(0)
    const m = p.moderation
    return (
        <div className='flex min-h-full flex-col'>
            <div className='border-b bg-linear-to-b from-primary/10 to-white px-6 pt-6 pb-5'>
                <SheetHeader className='p-0 pr-10'>
                    <div className='flex flex-wrap items-start gap-4'>
                        <div className='min-w-0 flex-1'>
                            <div className='flex flex-wrap items-center gap-2.5'>
                                <SheetTitle className='text-xl font-bold'>{p.title}</SheetTitle>
                                <ProductStatusPill status={p.status} stock={p.stock} moderation={m} />
                            </div>
                            <SheetDescription asChild>
                                <div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]'>
                                    <span>{p.category.parent ? `${p.category.parent.name} › ` : ''}{p.category.name}</span>
                                    <span>·</span>
                                    <span className='inline-flex items-center gap-1.5'>
                                        <span className='size-2.5 rounded-full' style={{ background: p.seller.brandColor }} />{p.seller.name}
                                    </span>
                                    {p.sku && <><span>·</span><span className='font-mono'>SKU {p.sku}</span></>}
                                </div>
                            </SheetDescription>
                        </div>
                        <div className='flex flex-wrap gap-2'>
                            <Button size='sm' variant='outline' className='cursor-pointer bg-white' asChild>
                                <a href={`${CUSTOMER_STORE_URL}/p/${p.seller.slug}/${p.slug}`} target='_blank' rel='noreferrer'><ExternalLinkIcon /> View in store</a>
                            </Button>
                            {canFlag && (
                                <Button size='sm' variant='outline' className='cursor-pointer bg-white' onClick={() => onAction(m.flagged ? 'UNFLAG' : 'FLAG')}>
                                    <FlagIcon /> {m.flagged ? 'Clear flag' : 'Flag listing'}
                                </Button>
                            )}
                            {canBlock && (m.blocked ? (
                                <Button size='sm' className='cursor-pointer' onClick={() => onAction('UNBLOCK')}><PowerIcon /> Reactivate listing</Button>
                            ) : (
                                <Button size='sm' variant='outline' className='cursor-pointer border-destructive/30 bg-white text-destructive hover:bg-destructive/5 hover:text-destructive' onClick={() => onAction('BLOCK')}>
                                    <BanIcon /> Deactivate listing
                                </Button>
                            ))}
                        </div>
                    </div>
                </SheetHeader>

                {(m.blocked || m.flagged) && (
                    <div className='mt-4 grid gap-2'>
                        {m.blocked && (
                            <div className='flex gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5 text-[13px]'>
                                <BanIcon className='mt-0.5 size-4 shrink-0 text-destructive' />
                                <div><span className='font-semibold text-destructive'>Deactivated by the platform</span> {m.blockedAt && <span className='text-muted-foreground'>· {moment(m.blockedAt).fromNow()}</span>}<div className='text-muted-foreground'>{m.blockReason}</div></div>
                            </div>
                        )}
                        {m.flagged && (
                            <div className='flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px]'>
                                <AlertTriangleIcon className='mt-0.5 size-4 shrink-0 text-amber-700' />
                                <div><span className='font-semibold text-amber-800'>Flagged</span> {m.flaggedAt && <span className='text-muted-foreground'>· {moment(m.flaggedAt).fromNow()}</span>}<div className='text-muted-foreground'>{m.flagReason}</div></div>
                            </div>
                        )}
                    </div>
                )}

                <div className='mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>
                    {[
                        ['Price', p.variants.length ? `${money(Math.min(...p.variants.map(v => v.price)))}+` : money(p.price)],
                        ['Stock', `${p.stock} units`],
                        ['Rating', p.rating.count ? <span className='inline-flex items-center gap-1'>{p.rating.avg.toFixed(1)}<StarIcon className='size-3.5 fill-amber-400 text-amber-400' /><span className='text-xs font-medium text-muted-foreground'>({p.rating.count})</span></span> : '—'],
                        ['In carts', p.counts.inCarts],
                        ['In wishlists', p.counts.inWishlists],
                        ['First ordered', p.firstOrderedAt ? moment(p.firstOrderedAt).format('D MMM YYYY') : 'Never'],
                    ].map(([k, v]) => (
                        <div key={String(k)} className='rounded-xl border bg-white p-3.5'>
                            <div className='text-[11.5px] text-muted-foreground'>{k}</div>
                            <div className='mt-1 text-lg font-bold tabular-nums'>{v}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className='grid flex-1 gap-5 px-6 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
                <section>
                    <h3 className='mb-2.5 text-sm font-bold'>Photos</h3>
                    {p.images.length ? (
                        <div className='rounded-xl border bg-white p-3'>
                            <img src={p.images[img]?.url} alt='' className='aspect-square w-full rounded-lg bg-muted object-contain' />
                            {p.images.length > 1 && (
                                <div className='mt-2.5 flex gap-2 overflow-x-auto'>
                                    {p.images.map((im, i) => (
                                        <button key={im.id} type='button' onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}
                                            className={cn('size-16 shrink-0 cursor-pointer overflow-hidden rounded-md border-2', i === img ? 'border-primary' : 'border-transparent')}>
                                            <img src={im.url} alt='' className='size-full object-cover' />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className='flex aspect-video items-center justify-center rounded-xl border border-dashed bg-white'><PackageIcon className='size-8 text-muted-foreground' /></div>
                    )}
                    {p.description && (
                        <>
                            <h3 className='mt-5 mb-2.5 text-sm font-bold'>Description</h3>
                            <p className='rounded-xl border bg-white p-4 text-[13px] leading-relaxed whitespace-pre-line text-muted-foreground'>{p.description}</p>
                        </>
                    )}
                </section>

                <div className='grid content-start gap-5'>
                    <section>
                        <h3 className='mb-2.5 text-sm font-bold'>Listing</h3>
                        <dl className='rounded-xl border bg-white p-4'>
                            <Info label='Seller' value={<>{p.seller.name}{p.seller.status !== 'ACTIVE' && <span className='ml-1.5 text-xs text-destructive'>({p.seller.status.toLowerCase()})</span>}</>} />
                            <Info label='Brand' value={p.brand ? <>{p.brand.name}{!p.brand.isActive && <span className='ml-1.5 text-xs text-destructive'>(deactivated)</span>}</> : '—'} />
                            <Info label='Tax class' value={`HSN ${p.tax.hsnCode} · ${p.tax.gstRatePercent}% GST`} />
                            <Info label='Price' value={<>{money(p.price)}{p.compareAtPrice && p.compareAtPrice > p.price && <span className='ml-1.5 text-xs text-muted-foreground line-through'>{money(p.compareAtPrice)}</span>}</>} />
                            <Info label='Low-stock alert at' value={`${p.lowStockThreshold} units`} />
                            <Info label='Listed' value={moment(p.createdAt).format('D MMM YYYY')} />
                            <Info label='Last updated' value={moment(p.updatedAt).fromNow()} />
                        </dl>
                    </section>

                    {p.variants.length > 0 && (
                        <section>
                            <h3 className='mb-2.5 text-sm font-bold'>Variants ({p.variants.length})</h3>
                            <div className='overflow-hidden rounded-xl border bg-white'>
                                <div className='grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr] bg-muted/50 px-4 py-2 text-[11.5px] font-semibold text-muted-foreground'>
                                    <span>Variant</span><span>SKU</span><span className='text-right'>Price</span><span className='text-right'>Stock</span>
                                </div>
                                {p.variants.map(v => (
                                    <div key={v.id} className='grid grid-cols-[1.4fr_0.8fr_0.8fr_0.6fr] items-center border-t px-4 py-2.5 text-[13px]'>
                                        <span className='font-medium'>{v.name}</span>
                                        <span className='truncate font-mono text-xs text-muted-foreground'>{v.sku ?? '—'}</span>
                                        <span className='text-right tabular-nums'>{money(v.price)}</span>
                                        <span className={cn('text-right tabular-nums', v.inventoryQty <= 0 && 'font-semibold text-destructive')}>{v.inventoryQty}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section>
                        <h3 className='mb-2.5 text-sm font-bold'>Delivery</h3>
                        <dl className='rounded-xl border bg-white p-4'>
                            <Info label='Package' value={PACKAGE[p.delivery.packageType] ?? p.delivery.packageType} />
                            <Info label='Weight' value={p.delivery.weightKg != null ? `${p.delivery.weightKg} kg` : '—'} />
                            <Info label='Cold chain' value={p.delivery.requiresColdChain ? 'Required' : 'No'} />
                            <Info label='Ships to' value={SCOPE[p.delivery.scope] ?? p.delivery.scope} />
                            {p.delivery.pincodes.length > 0 && <Info label='Pincodes' value={p.delivery.pincodes.join(', ')} />}
                        </dl>
                    </section>
                </div>
            </div>
        </div>
    )
}

/** Product details for platform admins (85% wide, like the customer drawer) */
export default function PlatformProductDrawer({ product, open, onOpenChange, canFlag, canBlock, onAction }: {
    product: PlatformProductDetail | null
    open: boolean
    onOpenChange: (o: boolean) => void
    canFlag: boolean
    canBlock: boolean
    onAction: (a: ModerationAction) => void
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side='right' className='w-full gap-0 overflow-y-auto bg-(--page) p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-[85vw]'>
                {!product ? (
                    <div className='p-6'>
                        <SheetHeader className='sr-only'><SheetTitle>Product</SheetTitle><SheetDescription>Loading product</SheetDescription></SheetHeader>
                        <Skeleton className='h-6 w-72' /><Skeleton className='mt-2 h-4 w-96' />
                        <div className='mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6'>{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className='h-[74px] rounded-xl' />)}</div>
                        <div className='mt-6 grid gap-5 lg:grid-cols-2'><Skeleton className='aspect-square rounded-xl' /><Skeleton className='h-80 rounded-xl' /></div>
                    </div>
                ) : <Body key={product.id} p={product} canFlag={canFlag} canBlock={canBlock} onAction={onAction} />}
            </SheetContent>
        </Sheet>
    )
}
