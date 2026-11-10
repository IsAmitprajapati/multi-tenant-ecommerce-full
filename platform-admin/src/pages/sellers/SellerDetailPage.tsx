import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import {
    BadgeCheckIcon, Building2Icon, CheckIcon, CopyIcon, ExternalLinkIcon, EyeIcon, FileTextIcon, HistoryIcon,
    ImageIcon, PaletteIcon, PencilIcon, PowerIcon, ShieldCheckIcon, UserIcon, UsersIcon, XIcon,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ConfirmDialog from '@/pages/user-permissions/_component/ConfirmDialog'
import KycDocumentDialog from './_component/KycDocumentDialog'
import StatusBadge from '@/pages/user-permissions/_component/StatusBadge'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { cn, displayUrl } from '@/lib/utils'
import { sellerApi, type ISellerDetail, type SellerStatusAction } from '@/api/seller'
import {
    ACTION_COPY, BUSINESS_TYPE_LABEL, isKycReviewable, KYC_DOC_PILL, KYC_DOCUMENT_LABEL, KYC_PILL, Pill, STATUS_PILL,
} from './_component/seller-status'


function Detail({ label, children, mono, className }: { label: string; children: React.ReactNode; mono?: boolean; className?: string }) {
    return (
        <div className={cn('min-w-0', className)}>
            <dt className='text-xs font-medium text-muted-foreground'>{label}</dt>
            <dd className={cn('mt-1 text-sm font-semibold break-words', mono && 'font-mono tracking-wide')}>
                {children ?? <span className='font-normal text-muted-foreground'>—</span>}
            </dd>
        </div>
    )
}

function Stat({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
    return (
        <Card size='sm'>
            <CardContent>
                <div className='text-xs font-medium text-muted-foreground'>{label}</div>
                <div className='mt-1.5 text-lg font-bold'>{children}</div>
                {hint && <div className='mt-0.5 text-xs text-muted-foreground'>{hint}</div>}
            </CardContent>
        </Card>
    )
}

function SectionCard({ icon: Icon, title, description, children, action }: {
    icon: typeof UserIcon; title: string; description?: string; children: React.ReactNode; action?: React.ReactNode
}) {
    return (
        <Card>
            <CardHeader className='border-b'>
                <div className='flex items-start justify-between gap-3'>
                    <div>
                        <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                            <Icon className='size-4 text-primary' /> {title}
                        </CardTitle>
                        {description && <CardDescription className='mt-1'>{description}</CardDescription>}
                    </div>
                    {action}
                </div>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

const SellerDetailPage = () => {
    const { sellerId } = useParams<{ sellerId: string }>()
    const navigate = useNavigate()
    const { can } = usePermission()
    const canManage = can('SELLERS', 'MANAGE')
    const canEdit = can('SELLERS', 'EDIT')

    const [seller, setSeller] = useState<ISellerDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [pending, setPending] = useState<SellerStatusAction | null>(null)
    const [acting, setActing] = useState(false)
    const [previewDoc, setPreviewDoc] = useState<ISellerDetail['kycDocuments'][number] | null>(null)

    const load = useCallback(() => {
        if (!sellerId) return
        setLoading(true)
        sellerApi.get(sellerId)
            .then(res => setSeller(res.data))
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Seller not found'))
                navigate('/dashboard/sellers', { replace: true })
            })
            .finally(() => setLoading(false))
    }, [sellerId, navigate])

    useEffect(() => { load() }, [load])

    const runAction = async () => {
        if (!seller || !pending) return
        setActing(true)
        try {
            const res = await sellerApi.changeStatus(seller.id, pending)
            setSeller(res.data)
            toast.success(res.message ?? 'Updated')
            setPending(null)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Action failed'))
        } finally {
            setActing(false)
        }
    }

    const copy = (text: string) => navigator.clipboard?.writeText(text).then(() => toast.success('Copied'))

    if (loading || !seller) {
        return (
            <div>
                <Skeleton className='mb-6 h-14 w-72' />
                <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className='h-24' />)}</div>
                <div className='mt-6 grid gap-6 lg:grid-cols-3'>
                    <Skeleton className='h-80 lg:col-span-2' /><Skeleton className='h-80' />
                </div>
            </div>
        )
    }

    const bd = seller.businessDetails
    const reviewable = isKycReviewable(seller.kycStatus)
    const actionCopy = pending && ACTION_COPY[pending]

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={seller.name}
                description={`${seller.categoryLabel} · joined ${moment(seller.createdAt).format('D MMM YYYY')}`}
                actions={(canEdit || canManage) && (
                    <>
                        {canEdit && (
                            <Button variant='outline' className='h-10 cursor-pointer' onClick={() => navigate(`/dashboard/sellers/${seller.id}/edit`)}>
                                <PencilIcon /> Edit details
                            </Button>
                        )}
                        {canManage && <>
                        {reviewable && (
                            <>
                                <Button variant='outline' className='h-10 cursor-pointer text-destructive' onClick={() => setPending('REJECT')}>
                                    <XIcon /> Reject KYC
                                </Button>
                                <Button className='h-10 cursor-pointer' onClick={() => setPending('APPROVE')}>
                                    <CheckIcon /> Approve KYC
                                </Button>
                            </>
                        )}
                        {seller.status === 'SUSPENDED' ? (
                            <Button variant='outline' className='h-10 cursor-pointer' onClick={() => setPending('REACTIVATE')}>
                                <PowerIcon /> Reactivate
                            </Button>
                        ) : (
                            <Button variant='outline' className='h-10 cursor-pointer text-destructive' onClick={() => setPending('SUSPEND')}>
                                <PowerIcon /> Suspend seller
                            </Button>
                        )}
                        </>}
                    </>
                )}
            />

            {/* Identity strip */}
            <div className='mb-6 flex flex-wrap items-center gap-4'>
                {seller.logoUrl
                    ? <img src={seller.logoUrl} alt='' className='size-14 rounded-xl border object-cover' />
                    : <span className='flex size-14 items-center justify-center rounded-xl text-xl font-bold text-white' style={{ background: seller.brandColor }}>
                        {seller.name.slice(0, 1).toUpperCase()}
                    </span>}
                <div className='min-w-0'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <Pill {...STATUS_PILL[seller.status]} />
                        <span className='text-xs text-muted-foreground'>KYC</span>
                        <Pill {...KYC_PILL[seller.kycStatus]} />
                    </div>
                    <button type='button' onClick={() => copy(seller.publicUrl)} title='Copy page URL'
                        className='mt-1.5 inline-flex cursor-pointer items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground'>
                        {displayUrl(seller.publicUrl).slice(0, -seller.slug.length)}<span className='font-semibold text-foreground'>{seller.slug}</span>
                        <CopyIcon className='size-3.5' />
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
                <Stat label='Commission rate' hint='Category default, adjustable in Commission & payouts'>{seller.commissionRate}%</Stat>
                <Stat label='KYC documents' hint={seller.kycOfflineReference ? 'Verified offline' : undefined}>
                    {seller.kycOfflineReference ? '—' : seller.kycDocuments.length}
                </Stat>
                <Stat label='Seller users' hint='Owner + staff'>{seller.users.length}</Stat>
                <Stat label='Onboarded' hint={seller.createdVia === 'ADMIN_INITIATED' ? `By ${seller.createdBy?.fullName ?? 'a platform admin'}` : 'Self-service signup'}>
                    {moment(seller.createdAt).fromNow()}
                </Stat>
            </div>

            <div className='mt-6 grid gap-6 lg:grid-cols-3'>
                <div className='grid content-start gap-6 lg:col-span-2'>
                    <SectionCard icon={Building2Icon} title='Business details' description='Legal and tax information.'>
                        <dl className='grid gap-x-6 gap-y-5 sm:grid-cols-2'>
                            <Detail label='Business name'>{bd?.legalBusinessName}</Detail>
                            <Detail label='Business type'>{bd && BUSINESS_TYPE_LABEL[bd.businessType]}</Detail>
                            <Detail label='Registered address' className='sm:col-span-2'>{bd?.registeredAddress}</Detail>
                            <Detail label='GST number' mono>{bd?.gstNumber}</Detail>
                            <Detail label='PAN number' mono>{bd?.panNumber}</Detail>
                        </dl>
                    </SectionCard>

                    <SectionCard
                        icon={ShieldCheckIcon}
                        title='KYC'
                        description={seller.kycOfflineReference
                            ? 'Documents were verified outside the platform.'
                            : 'Documents are private — click View to preview securely.'}
                        action={<Pill {...KYC_PILL[seller.kycStatus]} />}
                    >
                        {seller.kycOfflineReference ? (
                            <div className='flex items-center gap-3 rounded-lg border bg-muted/30 p-4'>
                                <BadgeCheckIcon className='size-5 shrink-0 text-primary' />
                                <div>
                                    <div className='text-sm font-semibold'>Verified offline</div>
                                    <div className='text-xs text-muted-foreground'>Reference: <span className='font-mono'>{seller.kycOfflineReference}</span></div>
                                </div>
                            </div>
                        ) : seller.kycDocuments.length === 0 ? (
                            <p className='text-sm text-muted-foreground'>No documents uploaded.</p>
                        ) : (
                            <ul className='divide-y rounded-lg border'>
                                {seller.kycDocuments.map(d => (
                                    <li key={d.id} className='flex flex-wrap items-center gap-3 p-3'>
                                        <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground'>
                                            {d.mimeType === 'application/pdf' ? <FileTextIcon className='size-4' /> : <ImageIcon className='size-4' />}
                                        </span>
                                        <div className='min-w-0 flex-1'>
                                            <div className='text-sm font-semibold'>{KYC_DOCUMENT_LABEL[d.documentType] ?? d.documentType}</div>
                                            <div className='truncate text-xs text-muted-foreground'>
                                                {d.fileName} · uploaded {moment(d.uploadedAt).format('D MMM YYYY')}
                                                {d.reviewedBy && ` · reviewed by ${d.reviewedBy.fullName}`}
                                            </div>
                                        </div>
                                        <Pill {...(KYC_DOC_PILL[d.status] ?? KYC_DOC_PILL.PENDING)} />
                                        <Button size='sm' variant='outline' className='cursor-pointer' onClick={() => setPreviewDoc(d)}>
                                            <EyeIcon /> View
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>

                    <SectionCard icon={UsersIcon} title='Seller users' description='People who can sign in to this seller’s admin panel.'>
                        {seller.users.length === 0 ? (
                            <p className='text-sm text-muted-foreground'>No users yet.</p>
                        ) : (
                            <ul className='divide-y rounded-lg border'>
                                {seller.users.map(u => (
                                    <li key={u.id} className='flex flex-wrap items-center gap-3 p-3'>
                                        <span className='flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary'>
                                            {u.fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
                                        </span>
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex items-center gap-2 text-sm font-semibold'>
                                                {u.fullName}
                                                {u.id === seller.owner.id && <span className='rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase'>Owner</span>}
                                            </div>
                                            <div className='truncate text-xs text-muted-foreground'>{u.email}</div>
                                        </div>
                                        <span className='text-xs text-muted-foreground'>{u.role?.name ?? 'No role'}</span>
                                        <span className='hidden text-xs text-muted-foreground sm:inline'>
                                            {u.lastActiveAt ? `Active ${moment(u.lastActiveAt).fromNow()}` : 'Not signed in yet'}
                                        </span>
                                        <StatusBadge status={u.status} />
                                    </li>
                                ))}
                            </ul>
                        )}
                    </SectionCard>
                </div>

                <div className='grid content-start gap-6'>
                    <SectionCard icon={UserIcon} title='Owner' description='Receives the invite and owns the account.'>
                        <dl className='grid gap-5'>
                            <Detail label='Name'>{bd?.contactPersonName ?? seller.owner.fullName}</Detail>
                            <Detail label='Email'>
                                <a href={`mailto:${seller.owner.email}`} className='text-primary hover:underline'>{seller.owner.email}</a>
                            </Detail>
                            <Detail label='Phone'>
                                {(bd?.contactPersonMobile ?? seller.owner.phone) && (
                                    <a href={`tel:${bd?.contactPersonMobile ?? seller.owner.phone}`} className='hover:underline'>{bd?.contactPersonMobile ?? seller.owner.phone}</a>
                                )}
                            </Detail>
                        </dl>
                    </SectionCard>

                    <SectionCard icon={PaletteIcon} title='Seller page & branding'>
                        <dl className='grid gap-5'>
                            <Detail label='Page URL'>
                                <a href={seller.publicUrl} target='_blank' rel='noopener noreferrer'
                                    className='inline-flex items-center gap-1.5 break-all text-primary hover:underline'>
                                    {displayUrl(seller.publicUrl)}
                                    <ExternalLinkIcon className='size-3.5 shrink-0' />
                                </a>
                            </Detail>
                            <Detail label={seller.categories.length > 1 ? 'Categories' : 'Category'}>{seller.categoryLabel}</Detail>
                            <Detail label='Brand color'>
                                <span className='inline-flex items-center gap-2'>
                                    <span className='inline-block size-5 rounded-md border' style={{ background: seller.brandColor }} />
                                    <span className='font-mono text-xs'>{seller.brandColor}</span>
                                </span>
                            </Detail>
                            <Detail label='Logo'>{seller.logoUrl ? 'Uploaded' : 'Not uploaded'}</Detail>
                        </dl>
                    </SectionCard>

                    <SectionCard icon={HistoryIcon} title='Activity'>
                        <dl className='grid gap-5'>
                            <Detail label='Onboarded via'>{seller.createdVia === 'ADMIN_INITIATED' ? 'Platform admin' : 'Self-service signup'}</Detail>
                            <Detail label='Created by'>{seller.createdBy?.fullName}</Detail>
                            <Detail label='Created'>{moment(seller.createdAt).format('D MMM YYYY, h:mm A')}</Detail>
                            <Detail label='Last updated'>{moment(seller.updatedAt).format('D MMM YYYY, h:mm A')}</Detail>
                        </dl>
                    </SectionCard>
                </div>
            </div>

            <KycDocumentDialog sellerId={seller.id} document={previewDoc} onOpenChange={open => !open && setPreviewDoc(null)} />

            {pending && actionCopy && (
                <ConfirmDialog
                    open
                    onOpenChange={open => !open && setPending(null)}
                    title={actionCopy.title(seller.name)}
                    description={actionCopy.description}
                    confirmLabel={actionCopy.confirm}
                    destructive={actionCopy.destructive}
                    loading={acting}
                    onConfirm={runAction}
                />
            )}
        </div>
    )
}

export default SellerDetailPage
