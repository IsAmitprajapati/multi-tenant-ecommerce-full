export function ActiveBadge({ active }: { active: boolean }) {
    return active
        ? <span className='inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary'><span className='size-1.5 rounded-full bg-primary' />Active</span>
        : <span className='inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground'><span className='size-1.5 rounded-full bg-muted-foreground' />Inactive</span>
}
