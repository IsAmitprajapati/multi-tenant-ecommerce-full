import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import moment from 'moment'
import { AlertTriangleIcon, CheckIcon, ClockIcon, MailIcon, RefreshCwIcon, RocketIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { fetchMe } from '@/store/auth/authSlice'
import { sellerPortalApi, type SellerApplication } from '@/api/seller-portal'

/** Design: Seller-Application-Submitted — status of the seller's review */
export default function ApplicationStatusPage() {
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const user = useAppSelector(s => s.auth.user)
    const userRef = useRef(user)
    userRef.current = user
    const [app, setApp] = useState<SellerApplication | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)

    const load = async (manual = false) => {
        manual ? setRefreshing(true) : setLoading(true)
        try {
            const res = await sellerPortalApi.getApplication()
            if (!res.data) { navigate('/apply/details', { replace: true }); return }
            setApp(res.data)
            if (res.data.status === 'ACTIVE') {
                // Let the dashboard gate know about the approval (only if it doesn't yet)
                if (userRef.current?.seller?.status !== 'ACTIVE') await dispatch(fetchMe())
                if (manual) toast.success('You’re approved — welcome aboard!')
            } else if (manual) {
                toast('Still under review — we’ll email you as soon as it’s done')
            }
        } catch (err) {
            toast.error(getAxiosErrorMessage(err, 'Could not load your application'))
        } finally {
            setLoading(false); setRefreshing(false)
        }
    }

    useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

    if (loading || !app) {
        return <div className='rounded-2xl border bg-card p-8'><Skeleton className='mx-auto h-8 w-64' /><Skeleton className='mt-6 h-40' /></div>
    }

    const approved = app.status === 'ACTIVE'
    const rejected = app.kycStatus === 'REJECTED'
    const firstName = (user?.fullName ?? app.owner.fullName).split(' ')[0]

    const timeline = [
        { label: 'Application & documents submitted', detail: moment(app.createdAt).format('D MMM YYYY, h:mm A'), state: 'done' as const },
        {
            label: rejected ? 'KYC could not be verified' : approved ? 'KYC verified by the platform team' : 'Platform team reviews KYC',
            detail: rejected ? 'Update your details and documents, then submit again' : approved ? 'Approved' : 'Usually within 2 business days',
            state: rejected ? 'error' as const : approved ? 'done' as const : 'current' as const,
        },
        { label: 'We email you when you’re approved', detail: app.owner.email, state: approved ? 'done' as const : 'todo' as const },
        { label: 'Sign in to your dashboard and go live', detail: 'List products and start selling', state: approved ? 'current' as const : 'todo' as const },
    ]

    return (
        <div className='rounded-2xl border bg-card p-6 text-center sm:p-10'>
            <span className={cn('mx-auto flex size-14 items-center justify-center rounded-full',
                rejected ? 'bg-destructive/10 text-destructive' : approved ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                {rejected ? <AlertTriangleIcon className='size-7' /> : approved ? <RocketIcon className='size-7' /> : <CheckIcon className='size-7' />}
            </span>
            <h1 className='mt-5 text-2xl font-bold'>
                {rejected ? 'Your application needs changes' : approved ? `You’re approved, ${firstName}!` : 'Application submitted'}
            </h1>
            <p className='mx-auto mt-2 max-w-lg text-sm text-muted-foreground'>
                {rejected
                    ? <>We couldn’t verify the KYC documents for <b className='text-foreground'>{app.name}</b>. Please check your details and upload clear copies.</>
                    : approved
                        ? <><b className='text-foreground'>{app.name}</b> is live on the marketplace. Your dashboard is ready.</>
                        : <>Thanks for applying, {firstName}. We’re reviewing your business details and KYC documents for <b className='text-foreground'>{app.name}</b>.</>}
            </p>
            <span className={cn('mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                rejected ? 'bg-destructive/10 text-destructive' : approved ? 'bg-primary/10 text-primary' : 'bg-amber-100 text-amber-800')}>
                {rejected ? 'Changes needed' : approved ? 'Approved' : <><ClockIcon className='size-3.5' /> Pending review</>}
            </span>

            <ol className='mx-auto mt-8 max-w-md space-y-4 text-left'>
                {timeline.map((t, i) => (
                    <li key={i} className='flex gap-3'>
                        <span className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            t.state === 'done' && 'bg-primary text-primary-foreground',
                            t.state === 'current' && 'border-2 border-primary text-primary',
                            t.state === 'error' && 'bg-destructive text-white',
                            t.state === 'todo' && 'border-2 border-border text-muted-foreground')}>
                            {t.state === 'done' ? <CheckIcon className='size-3.5' /> : t.state === 'error' ? '!' : i + 1}
                        </span>
                        <div>
                            <div className={cn('text-sm font-semibold', t.state === 'todo' && 'text-muted-foreground')}>{t.label}</div>
                            <div className='text-xs text-muted-foreground'>{t.detail}</div>
                        </div>
                    </li>
                ))}
            </ol>

            <div className='mt-8 flex flex-wrap justify-center gap-2'>
                {approved ? (
                    <Button className='h-11 px-6' onClick={() => navigate('/dashboard')}><RocketIcon /> Go to dashboard</Button>
                ) : rejected ? (
                    <Button className='h-11 px-6' onClick={() => navigate('/apply/details')}>Update &amp; re-submit</Button>
                ) : (
                    <Button variant='outline' className='h-11 px-6' onClick={() => load(true)} disabled={refreshing}>
                        {refreshing ? <Spinner /> : <RefreshCwIcon />} Check application status
                    </Button>
                )}
                <Button asChild variant='ghost' className='h-11'><Link to='/'>Back to homepage</Link></Button>
            </div>
            {!approved && (
                <p className='mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground'>
                    <MailIcon className='size-3.5' /> Questions? Reply to the confirmation email we sent to {app.owner.email}
                </p>
            )}
        </div>
    )
}
