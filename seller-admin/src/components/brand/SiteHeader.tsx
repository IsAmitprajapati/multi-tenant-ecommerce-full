import { Link } from 'react-router'
import { StoreIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'

export const BRAND_NAME = 'Platform for Sellers'

/**
 * One container for every public seller page (landing, signup/onboarding):
 * same max width + side padding, so the logo and content edges line up everywhere.
 */
export const SITE_CONTAINER = 'mx-auto w-full max-w-7xl px-4 sm:px-8'

/** The app logo: brand-green rounded square with the store icon + name — used on every seller screen */
export function BrandLogo({ inverted, className, to = '/' }: { inverted?: boolean; className?: string; to?: string }) {
    return (
        <Link to={to} className={cn('flex shrink-0 items-center gap-2.5', className)} aria-label={`${BRAND_NAME} — home`}>
            <span className={cn('flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground', inverted && 'ring-1 ring-white/40')} aria-hidden>
                <StoreIcon className='size-5' />
            </span>
            <span className={cn('text-[15px] font-bold whitespace-nowrap', inverted ? 'text-white' : 'text-foreground')}>{BRAND_NAME}</span>
        </Link>
    )
}

/** Shared top bar: logo on the left, page-specific actions on the right */
export default function SiteHeader({ children }: { children?: React.ReactNode }) {
    return (
        <header className='sticky top-0 z-40 shrink-0 border-b bg-white/95 backdrop-blur'>
            <div className={cn(SITE_CONTAINER, 'flex h-16 items-center justify-between gap-6')}>
                <BrandLogo />
                {children && <div className='flex min-w-0 items-center gap-3'>{children}</div>}
            </div>
        </header>
    )
}

/** Full-screen loading state with the brand logo (route guards, first load) */
export function BrandLoader() {
    return (
        <div className='flex min-h-svh flex-col items-center justify-center gap-5 bg-(--page)'>
            <BrandLogo />
            <Spinner className='size-5 text-primary' />
        </div>
    )
}
