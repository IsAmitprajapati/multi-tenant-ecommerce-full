import { useState } from 'react'
import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

export interface CategoryOption {
    id: string
    name: string
    description: string | null
    commissionRate: number
    requiresFssai: boolean
}

/** What a set of chosen categories means for the seller (mirrors the backend rule) */
export function summarizeCategories(options: CategoryOption[], selected: string[]) {
    const chosen = options.filter(o => selected.includes(o.id))
    return {
        chosen,
        commissionRate: chosen.length ? Math.max(...chosen.map(c => c.commissionRate)) : null,
        requiresFssai: chosen.some(c => c.requiresFssai),
    }
}

/**
 * Multi-select dropdown of top-level categories (from Global catalog).
 * Closed: chosen categories as removable chips. Open: searchable list with checkboxes.
 */
export default function CategoryMultiSelect({ options, value, onChange, disabled, invalid, placeholder = 'Select categories' }: {
    options: CategoryOption[]
    value: string[]
    onChange: (ids: string[]) => void
    disabled?: boolean
    invalid?: boolean
    placeholder?: string
}) {
    const [open, setOpen] = useState(false)
    const toggle = (id: string) => onChange(value.includes(id) ? value.filter(v => v !== id) : [...value, id])
    const { chosen, commissionRate, requiresFssai } = summarizeCategories(options, value)

    return (
        <div className='grid min-w-0 gap-2'>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild disabled={disabled}>
                    <button
                        type='button'
                        role='combobox'
                        aria-expanded={open}
                        aria-haspopup='listbox'
                        aria-invalid={invalid}
                        className={cn(
                            'flex min-h-10 w-full items-center gap-2 rounded-lg border border-input bg-transparent py-1.5 pr-2 pl-2.5 text-left text-sm transition-colors outline-none',
                            'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
                            invalid && 'border-destructive ring-3 ring-destructive/20',
                            !disabled && 'cursor-pointer'
                        )}
                    >
                        <span className='flex min-w-0 flex-1 flex-wrap gap-1.5'>
                            {chosen.length === 0 && <span className='py-0.5 text-muted-foreground'>{placeholder}</span>}
                            {chosen.map(c => (
                                <span key={c.id} className='inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 py-0.5 pr-0.5 pl-2 text-xs font-semibold text-primary'>
                                    <span className='truncate'>{c.name}</span>
                                    <span
                                        role='button'
                                        tabIndex={-1}
                                        aria-label={`Remove ${c.name}`}
                                        className='rounded p-0.5 hover:bg-primary/15'
                                        // Remove without opening the dropdown
                                        onPointerDown={e => { e.preventDefault(); e.stopPropagation() }}
                                        onClick={e => { e.preventDefault(); e.stopPropagation(); if (!disabled) toggle(c.id) }}
                                    >
                                        <XIcon className='size-3' />
                                    </span>
                                </span>
                            ))}
                        </span>
                        <ChevronDownIcon className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
                    </button>
                </PopoverTrigger>
                <PopoverContent align='start' className='w-(--radix-popover-trigger-width) min-w-72 p-0'>
                    <Command>
                        <CommandInput placeholder='Search categories…' />
                        <CommandList className='max-h-72'>
                            <CommandEmpty>No categories found.</CommandEmpty>
                            <CommandGroup>
                                {options.map(o => {
                                    const on = value.includes(o.id)
                                    return (
                                        <CommandItem key={o.id} value={o.name} onSelect={() => toggle(o.id)} className='cursor-pointer items-start py-2'>
                                            <span className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border', on ? 'border-primary bg-primary text-primary-foreground' : 'border-input')}>
                                                {on && <CheckIcon className='size-3 text-primary-foreground!' />}
                                            </span>
                                            <span className='min-w-0 flex-1'>
                                                <span className='flex items-center gap-2'>
                                                    <span className='truncate font-medium'>{o.name}</span>
                                                    {o.requiresFssai && <span className='shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800'>FSSAI</span>}
                                                </span>
                                                {o.description && <span className='mt-0.5 block truncate text-xs text-muted-foreground'>{o.description}</span>}
                                            </span>
                                            <span className='shrink-0 text-xs text-muted-foreground tabular-nums'>{o.commissionRate}%</span>
                                        </CommandItem>
                                    )
                                })}
                            </CommandGroup>
                        </CommandList>
                        {value.length > 0 && (
                            <div className='flex items-center justify-between border-t px-3 py-2 text-xs'>
                                <span className='text-muted-foreground'>{value.length} selected</span>
                                <button type='button' className='cursor-pointer font-semibold text-primary hover:underline' onClick={() => onChange([])}>Clear all</button>
                            </div>
                        )}
                    </Command>
                </PopoverContent>
            </Popover>

            {chosen.length > 0 && (
                <p className='text-xs text-muted-foreground'>
                    Default commission <b className='text-foreground'>{commissionRate}%</b>
                    {chosen.length > 1 && ' (highest of the selected)'}
                    {requiresFssai && <> · <b className='text-amber-700'>FSSAI license required</b></>}
                </p>
            )}
            {options.length === 0 && <p className='text-xs text-muted-foreground'>No categories are available yet.</p>}
        </div>
    )
}
