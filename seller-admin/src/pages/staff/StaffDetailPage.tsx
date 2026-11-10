import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { HistoryIcon, MailIcon, PencilIcon, PowerIcon, ShieldCheckIcon, UserIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import ConfirmDialog from '@/components/common/ConfirmDialog'
import StatusBadge from '@/components/common/StatusBadge'
import { usePermission } from '@/hooks/use-permission'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { teamApi, type ISellerRole, type IStaff } from '@/api/team'
import { RolePermissionsTable } from './_component/role-ui'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className='flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6'>
            <dt className='text-sm text-muted-foreground'>{label}</dt>
            <dd className='text-sm font-semibold break-all sm:text-right'>{children ?? <span className='font-normal text-muted-foreground'>—</span>}</dd>
        </div>
    )
}

export default function StaffDetailPage() {
    const { staffId } = useParams<{ staffId: string }>()
    const navigate = useNavigate()
    const { can, userId } = usePermission()
    const canEdit = can('SELLER_STAFF_ROLES', 'EDIT')

    const [staff, setStaff] = useState<IStaff | null>(null)
    const [role, setRole] = useState<ISellerRole | null>(null)
    const [confirm, setConfirm] = useState(false)
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        if (!staffId) return
        teamApi.getStaff(staffId)
            .then(async res => {
                setStaff(res.data)
                if (res.data.role) setRole((await teamApi.getRole(res.data.role.id)).data)
            })
            .catch(err => {
                toast.error(getAxiosErrorMessage(err, 'Staff member not found'))
                navigate('/dashboard/staff', { replace: true })
            })
    }, [staffId, navigate])

    if (!staff) {
        return <div><Skeleton className='mb-6 h-14 w-72' /><div className='grid gap-6 lg:grid-cols-5'><Skeleton className='h-64 lg:col-span-2' /><Skeleton className='h-96 lg:col-span-3' /></div></div>
    }

    const locked = staff.isOwner || staff.id === userId

    const toggleStatus = async () => {
        setBusy(true)
        try {
            const res = await teamApi.setStatus(staff.id, staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')
            setStaff(res.data)
            toast.success(res.message ?? 'Updated')
            setConfirm(false)
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not update status'))
        } finally { setBusy(false) }
    }

    const resend = async () => {
        try { toast.success((await teamApi.resendInvite(staff.id)).message) }
        catch (err) { toast.error(getAxiosErrorMessage(err, 'Could not resend the invite')) }
    }

    return (
        <div className='pb-10'>
            <PageHeader
                back
                title={staff.fullName}
                description={staff.email}
                actions={canEdit && (
                    <>
                        {staff.invitePending && <Button variant='outline' className='h-10 cursor-pointer' onClick={resend}><MailIcon /> Resend invite</Button>}
                        {!locked && (
                            <Button variant='outline' className={staff.status === 'ACTIVE' ? 'h-10 cursor-pointer text-destructive' : 'h-10 cursor-pointer'} onClick={() => setConfirm(true)}>
                                <PowerIcon /> {staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </Button>
                        )}
                        <Button className='h-10 cursor-pointer' onClick={() => navigate(`/dashboard/staff/${staff.id}/edit`)}><PencilIcon /> Edit</Button>
                    </>
                )}
            />

            <div className='grid gap-6 lg:grid-cols-5'>
                <div className='grid h-fit gap-6 lg:col-span-2'>
                    <Card>
                        <CardHeader className='border-b'>
                            <div className='flex items-center gap-3'>
                                <Avatar className='size-12'>
                                    <AvatarFallback className='bg-primary/10 font-semibold text-primary'>
                                        {staff.fullName.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className='min-w-0'>
                                    <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                        <span className='truncate'>{staff.fullName}</span>
                                        {staff.isOwner && <span className='rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary uppercase'>Owner</span>}
                                    </CardTitle>
                                    <div className='mt-1'><StatusBadge status={staff.status} /></div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <dl>
                                <div className='mb-1 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase'><UserIcon className='size-3.5' /> Contact</div>
                                <Row label='Email'><a href={`mailto:${staff.email}`} className='text-primary hover:underline'>{staff.email}</a></Row>
                                <Row label='Phone'>{staff.phone}</Row>
                                <Row label='Role'>{staff.role?.name}</Row>
                            </dl>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'><HistoryIcon className='size-4 text-primary' /> Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <dl>
                                <Row label='Added'>{moment(staff.createdAt).format('D MMM YYYY, h:mm A')}</Row>
                                <Row label='Last active'>
                                    {staff.invitePending
                                        ? <span className='inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800'><MailIcon className='size-3' /> Invite pending</span>
                                        : moment(staff.lastActiveAt).fromNow()}
                                </Row>
                            </dl>
                        </CardContent>
                    </Card>
                </div>

                <Card className='h-fit lg:col-span-3'>
                    <CardHeader className='border-b'>
                        <div className='flex items-start justify-between gap-3'>
                            <div>
                                <CardTitle className='flex items-center gap-2 text-base font-semibold'><ShieldCheckIcon className='size-4 text-primary' /> {staff.role?.name ?? 'No role'}</CardTitle>
                                <CardDescription className='mt-1'>{role?.description ?? 'What this person can access in your dashboard.'}</CardDescription>
                            </div>
                            {role && <Button asChild variant='ghost' size='sm'><Link to={`/dashboard/staff/roles/${role.id}`}>View role</Link></Button>}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {role ? <RolePermissionsTable role={role} /> : staff.role ? <Skeleton className='h-80' /> : <p className='text-sm text-muted-foreground'>No role assigned — they can’t access anything yet.</p>}
                    </CardContent>
                </Card>
            </div>

            {confirm && (
                <ConfirmDialog
                    open
                    onOpenChange={setConfirm}
                    title={`${staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${staff.fullName}?`}
                    description={staff.status === 'ACTIVE' ? 'They’ll be signed out of every device and won’t be able to sign in until re-activated.' : 'They’ll be able to sign in again.'}
                    confirmLabel={staff.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    destructive={staff.status === 'ACTIVE'}
                    loading={busy}
                    onConfirm={toggleStatus}
                />
            )}
        </div>
    )
}
