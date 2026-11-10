import React from 'react'
import { cn } from '@/lib/utils'
import TitleHeading from './Heading'

/** id of the dashboard's scroll container (see layouts/DashboardLayouts.tsx) */
export const PAGE_SCROLL_ID = 'page-scroll'

export function scrollPageToTop(behavior: ScrollBehavior = 'smooth') {
    document.getElementById(PAGE_SCROLL_ID)?.scrollTo({ top: 0, behavior })
}

interface PageHeaderProps {
    title: string
    description?: React.ReactNode
    back?: boolean
    /** Buttons on the right (primary action, etc.) */
    actions?: React.ReactNode
    /** Rendered under the title row — tabs, stepper, filters */
    children?: React.ReactNode
    className?: string
}

/**
 * Standard page header for every dashboard page (title, description, back, actions, optional tabs/stepper).
 * It scrolls with the page content; only the dashboard top bar stays fixed.
 */
const PageHeader = ({ title, description, back, actions, children, className }: PageHeaderProps) => (
    <header className={cn('mb-5 lg:mb-6', className)}>
        <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <TitleHeading title={title} description={description as string} back={back} />
            {actions && <div className='flex shrink-0 flex-wrap items-center gap-2'>{actions}</div>}
        </div>
        {children && <div className='mt-4'>{children}</div>}
    </header>
)

export default PageHeader
