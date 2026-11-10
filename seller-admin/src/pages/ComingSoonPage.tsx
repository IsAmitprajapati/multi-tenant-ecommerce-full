import { Link } from 'react-router'
import { ConstructionIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

/** Placeholder for seller modules that aren't built yet (products, orders, …) */
export default function ComingSoonPage({ title, description }: { title: string; description: string }) {
    return (
        <div>
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
