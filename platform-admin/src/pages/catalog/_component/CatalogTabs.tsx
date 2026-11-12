import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const TABS = [
    { to: '/dashboard/global-catalog/categories', label: 'Master categories' },
    { to: '/dashboard/global-catalog/attributes', label: 'Attributes' },
    { to: '/dashboard/global-catalog/brands', label: 'Brands' },
    { to: '/dashboard/global-catalog/tax-classes', label: 'HSN / tax classes' },
    { to: '/dashboard/global-catalog/products', label: 'Products' },
]

/** Global catalog section tabs (design: Admin-Catalog) — each tab is its own route */
export default function CatalogTabs() {
    return (
        <nav className='-mb-px flex gap-1 overflow-x-auto border-b' aria-label='Global catalog sections'>
            {TABS.map(t => (
                <NavLink key={t.to} to={t.to}
                    className={({ isActive }) => cn('shrink-0 border-b-2 px-3 pb-2.5 text-sm font-semibold transition-colors',
                        isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
                    {t.label}
                </NavLink>
            ))}
        </nav>
    )
}
