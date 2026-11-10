import { Link, Outlet } from 'react-router'
import { CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { logoutUser } from '@/store/auth/authSlice'
import SiteHeader from '@/components/brand/SiteHeader'

export const APPLY_STEPS = ['Account', 'Seller page', 'Business info', 'KYC', 'Review'] as const

/** Step indicator for the 5-step seller signup (design: Seller-Signup) */
export function ApplyStepper({ step }: { step: number }) {
    return (
        <ol className='mb-8 flex items-start'>
            {APPLY_STEPS.map((label, i) => {
                const done = i < step
                const current = i === step
                return (
                    <li key={label} className='flex flex-1 items-start last:flex-none'>
                        <div className='flex flex-col items-center gap-2'>
                            <span
                                aria-current={current ? 'step' : undefined}
                                className={cn(
                                    'flex size-8 items-center justify-center rounded-full border-2 text-[13px] font-bold transition-colors',
                                    done && 'border-primary bg-primary text-primary-foreground',
                                    current && 'border-primary bg-primary/10 text-primary',
                                    !done && !current && 'border-border bg-muted text-muted-foreground'
                                )}
                            >
                                {done ? <CheckIcon className='size-4' /> : i + 1}
                            </span>
                            <span className={cn('hidden text-[11.5px] font-semibold whitespace-nowrap sm:block', i <= step ? 'text-foreground' : 'text-muted-foreground')}>
                                {label}
                            </span>
                        </div>
                        {i < APPLY_STEPS.length - 1 && (
                            <div className={cn('mx-2 mt-4 h-0.5 flex-1 rounded-full', done ? 'bg-primary' : 'bg-border')} />
                        )}
                    </li>
                )
            })}
        </ol>
    )
}

/** Shell for the seller application — header matches the Seller-Signup design */
export default function ApplyLayout() {
    const dispatch = useAppDispatch()
    const auth = useAppSelector(s => s.auth)
    const signedIn = Boolean(auth.accessToken)

    return (
        <div className='flex min-h-svh flex-col bg-(--page)'>
            <SiteHeader>
                {signedIn ? (
                    <span className='flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted-foreground'>
                        {auth.user?.email && (
                            <>
                                <span className='hidden sm:inline'>Signed in as</span>
                                <span className='hidden max-w-48 truncate font-medium text-foreground sm:inline'>{auth.user.email}</span>
                                <span className='hidden sm:inline'>·</span>
                            </>
                        )}
                        <button type='button' onClick={() => dispatch(logoutUser())} className='cursor-pointer font-semibold text-primary hover:underline'>
                            Sign out
                        </button>
                    </span>
                ) : (
                    <span className='text-[12.5px] whitespace-nowrap text-muted-foreground'>
                        Already selling?{' '}
                        <Link to='/auth/login' className='font-semibold text-primary hover:underline'>Sign in</Link>
                    </span>
                )}
            </SiteHeader>
            <main className='mx-auto w-full max-w-[760px] flex-1 px-4 py-10'>
                <Outlet />
            </main>
        </div>
    )
}
