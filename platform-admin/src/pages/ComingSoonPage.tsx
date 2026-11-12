import { Link } from 'react-router'
import { CompassIcon, ConstructionIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

/** Placeholder for platform modules that aren't built yet — every sidebar link opens a real page */
export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
    return (
        <div className='pb-10'>
            <PageHeader title={title} description={description} />
            <Empty className='min-h-[50vh] rounded-2xl border border-dashed bg-card'>
                <EmptyHeader>
                    <EmptyMedia variant='icon' className='bg-primary/10 text-primary'><ConstructionIcon /></EmptyMedia>
                    <EmptyTitle>{title} is coming soon</EmptyTitle>
                    <EmptyDescription>We’re building this section. You’ll be able to manage it right here.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button asChild variant='outline'><Link to='/dashboard'>Back to dashboard</Link></Button>
                </EmptyContent>
            </Empty>
        </div>
    )
}

/** Unknown address inside the dashboard */
export function NotFoundPage() {
    return (
        <Empty className='min-h-[60vh]'>
            <EmptyHeader>
                <EmptyMedia variant='icon' className='bg-muted text-muted-foreground'><CompassIcon /></EmptyMedia>
                <EmptyTitle>Page not found</EmptyTitle>
                <EmptyDescription>This link doesn’t go anywhere. It may have moved, or the address has a typo.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button asChild variant='outline'><Link to='/dashboard'>Back to dashboard</Link></Button>
            </EmptyContent>
        </Empty>
    )
}
