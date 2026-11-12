import { useMemo, useState } from 'react'
import { CheckIcon, SparklesIcon, XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { CatalogAttribute } from '@/api/products'

const NOT_SET = '__none__'

/**
 * Details › Specifications — one value per attribute (e.g. RAM: 8GB), shown on the product page.
 * Specs saved earlier for attributes that are no longer offered stay until the seller removes them.
 */
export function SpecificationsPicker({ attributes, specs, onChange }: {
    attributes: CatalogAttribute[]
    specs: Record<string, string>
    onChange: (next: Record<string, string>) => void
}) {
    const offered = new Set(attributes.map(a => a.name))
    const orphans = Object.entries(specs).filter(([name, v]) => v && !offered.has(name))
    const setOne = (name: string, value: string) => {
        const next = { ...specs }
        if (value === NOT_SET) delete next[name]
        else next[name] = value
        onChange(next)
    }

    if (attributes.length === 0 && orphans.length === 0) {
        return <p className='rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground'>Choose a category to see its specifications.</p>
    }
    return (
        <div className='grid gap-4'>
            <div className='grid gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3'>
                {attributes.map(a => {
                    // a saved value the platform later removed from the list is still shown
                    const values = specs[a.name] && !a.values.includes(specs[a.name]) ? [specs[a.name], ...a.values] : a.values
                    return (
                        <div key={a.id} className='grid content-start gap-1.5'>
                            <Label className='text-xs font-semibold text-muted-foreground'>{a.name}</Label>
                            <Select value={specs[a.name] ?? NOT_SET} onValueChange={v => setOne(a.name, v)}>
                                <SelectTrigger className={cn('h-10! w-full cursor-pointer', !specs[a.name] && 'text-muted-foreground')}><SelectValue /></SelectTrigger>
                                <SelectContent position='popper' className='max-h-72'>
                                    <SelectItem value={NOT_SET} className='cursor-pointer text-muted-foreground'>Not set</SelectItem>
                                    {values.map(v => <SelectItem key={v} value={v} className='cursor-pointer'>{v}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )
                })}
            </div>
            {orphans.length > 0 && (
                <div className='flex flex-wrap items-center gap-2 text-xs'>
                    <span className='text-muted-foreground'>Saved earlier:</span>
                    {orphans.map(([name, v]) => (
                        <span key={name} className='inline-flex items-center gap-1 rounded-full bg-muted py-1 pr-1 pl-2.5 font-medium'>
                            {name}: {v}
                            <button type='button' className='cursor-pointer rounded-full p-0.5 hover:bg-background' aria-label={`Remove ${name}`} onClick={() => setOne(name, NOT_SET)}>
                                <XIcon className='size-3' />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

/** Every combination of the picked values, in attribute order: [["8GB","128GB"], ["8GB","256GB"], …] */
function combine(lists: string[][]): string[][] {
    return lists.reduce<string[][]>((acc, list) => acc.flatMap(prefix => list.map(v => [...prefix, v])), [[]])
}

const MAX_VARIANTS = 50

/**
 * Pricing › Variants › Generate from attributes — pick values of one or two attributes
 * (e.g. RAM 6GB, 8GB × Storage 128GB, 256GB) and add a variant row for each combination.
 */
export function VariantGeneratorDialog({ open, onOpenChange, attributes, existingNames, existingCount, onGenerate }: {
    open: boolean
    onOpenChange: (o: boolean) => void
    attributes: CatalogAttribute[]
    existingNames: string[]
    existingCount: number
    onGenerate: (names: string[]) => void
}) {
    const [picked, setPicked] = useState<Record<string, string[]>>({})
    const toggle = (attr: CatalogAttribute, value: string) => setPicked(p => {
        const cur = p[attr.id] ?? []
        const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
        // keep values in the platform's order (S, M, L — not click order)
        return { ...p, [attr.id]: attr.values.filter(v => next.includes(v)) }
    })
    const used = attributes.filter(a => (picked[a.id] ?? []).length > 0)
    const tooManyAttrs = used.length > 2

    const { fresh, skipped } = useMemo(() => {
        if (!used.length || tooManyAttrs) return { fresh: [] as string[], skipped: 0 }
        const taken = new Set(existingNames.map(n => n.trim().toLowerCase()))
        const names = combine(used.map(a => picked[a.id])).map(parts => parts.join(' · '))
        const fresh = names.filter(n => !taken.has(n.toLowerCase()))
        return { fresh, skipped: names.length - fresh.length }
    }, [used, picked, existingNames, tooManyAttrs])
    const overLimit = existingCount + fresh.length > MAX_VARIANTS

    return (
        <Dialog open={open} onOpenChange={o => { onOpenChange(o); if (!o) setPicked({}) }}>
            <DialogContent className='sm:max-w-xl'>
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'><SparklesIcon className='size-4 text-primary' /> Generate variants</DialogTitle>
                    <DialogDescription>Pick values from one or two attributes — a variant is added for every combination. You set each one’s price and stock after.</DialogDescription>
                </DialogHeader>

                <div className='-mx-1 grid max-h-[55vh] gap-4 overflow-y-auto px-1'>
                    {attributes.length === 0 && <p className='text-sm text-muted-foreground'>No attributes for this category yet.</p>}
                    {attributes.map(a => {
                        const sel = picked[a.id] ?? []
                        const disabled = tooManyAttrs ? sel.length === 0 : used.length >= 2 && sel.length === 0
                        return (
                            <div key={a.id} className={cn('grid gap-2', disabled && 'opacity-50')}>
                                <div className='flex items-center justify-between'>
                                    <p className='text-sm font-semibold'>{a.name}</p>
                                    {sel.length > 0 && <button type='button' className='cursor-pointer text-xs text-muted-foreground hover:text-foreground' onClick={() => setPicked(p => ({ ...p, [a.id]: [] }))}>Clear</button>}
                                </div>
                                <div className='flex flex-wrap gap-1.5'>
                                    {a.values.map(v => {
                                        const on = sel.includes(v)
                                        return (
                                            <button key={v} type='button' disabled={disabled} onClick={() => toggle(a, v)} aria-pressed={on}
                                                className={cn('inline-flex h-8 cursor-pointer items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors disabled:cursor-not-allowed',
                                                    on ? 'border-primary bg-primary/10 text-primary' : 'bg-white hover:border-foreground/30')}>
                                                {on && <CheckIcon className='size-3' />} {v}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className='rounded-lg bg-muted/50 px-3 py-2 text-sm'>
                    {used.length === 0 ? <span className='text-muted-foreground'>Nothing picked yet.</span> : (
                        <>
                            <span className='font-semibold'>{fresh.length} new variant{fresh.length === 1 ? '' : 's'}</span>
                            {fresh.length > 0 && <span className='text-muted-foreground'> — {fresh.slice(0, 4).join(', ')}{fresh.length > 4 ? `, +${fresh.length - 4} more` : ''}</span>}
                            {skipped > 0 && <span className='text-muted-foreground'> · {skipped} already added</span>}
                        </>
                    )}
                    {overLimit && <p className='mt-1 text-xs text-destructive'>A product can have up to {MAX_VARIANTS} variants — pick fewer values.</p>}
                </div>

                <DialogFooter>
                    <Button type='button' variant='outline' className='cursor-pointer' onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type='button' className='cursor-pointer' disabled={!fresh.length || overLimit}
                        onClick={() => { onGenerate(fresh); onOpenChange(false); setPicked({}) }}>
                        Add {fresh.length || ''} variant{fresh.length === 1 ? '' : 's'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
