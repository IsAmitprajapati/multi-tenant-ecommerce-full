import Link from 'next/link'

const SORTS = [
  { key: 'latest', label: 'Newest' },
  { key: 'deals', label: 'Best deals' },
  { key: 'trending', label: 'Trending' },
]

export default function SortTabs({ basePath, active, extra = {} }: { basePath: string; active: string; extra?: Record<string, string> }) {
  return (
    <nav className='no-scrollbar flex gap-1.5 overflow-x-auto' aria-label='Sort products'>
      {SORTS.map((s) => {
        const on = s.key === active.toLowerCase()
        const qs = new URLSearchParams({ ...extra, sort: s.key })
        return (
          <Link key={s.key} href={`${basePath}?${qs}`} aria-current={on ? 'true' : undefined}
            className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold ${on ? 'border-brand-600 bg-brand-600 text-white' : 'border-n-200 bg-white hover:border-brand-600'}`}>
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}
