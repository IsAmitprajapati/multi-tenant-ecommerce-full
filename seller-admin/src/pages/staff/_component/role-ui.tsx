import { createColumnHelper } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/Datatable/data-table'
import type { DataTableFeatures } from '@/components/Datatable/data-table-features'
import { PERMISSION_LEVELS, PERMISSION_MODULES, type PermissionLevel } from '@/lib/permissions'
import type { ISellerRole } from '@/api/team'

export const LEVEL_PILL: Record<PermissionLevel, string> = {
    NONE: 'bg-muted text-muted-foreground',
    VIEW: 'bg-sky-100 text-sky-800',
    EDIT: 'bg-amber-100 text-amber-800',
    MANAGE: 'bg-primary/10 text-primary',
}

export const levelLabel = (l: string) => PERMISSION_LEVELS.find(x => x.value === l)?.label ?? l
export const moduleInfo = (m: string) => PERMISSION_MODULES.find(x => x.key === m)

export function LevelPill({ level }: { level: PermissionLevel }) {
    return <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold', LEVEL_PILL[level])}>{levelLabel(level)}</span>
}

/** How many modules a role can access, e.g. 7 / 12 */
export const grantedCount = (r: ISellerRole) => r.permissions.filter(p => p.level !== 'NONE').length

/** Short summary, e.g. "Orders: Manage · Products: View · +2 more" */
export function roleSummary(role: ISellerRole, max = 3) {
    const granted = role.permissions.filter(p => p.level !== 'NONE')
    if (!granted.length) return 'No access'
    const parts = granted.slice(0, max).map(p => `${moduleInfo(p.module)?.label ?? p.module}: ${levelLabel(p.level)}`)
    return parts.join(' · ') + (granted.length > max ? ` · +${granted.length - max} more` : '')
}

type PermissionRow = ISellerRole['permissions'][number]
const permissionColumn = createColumnHelper<DataTableFeatures, PermissionRow>()

const permissionColumns = permissionColumn.columns([
    permissionColumn.accessor('module', {
        header: 'Module',
        cell: ({ row }) => (
            <span className={cn('font-medium', row.original.level === 'NONE' && 'text-muted-foreground')}>
                {moduleInfo(row.original.module)?.label ?? row.original.module}
            </span>
        ),
    }),
    permissionColumn.display({
        id: 'covers',
        header: 'Covers',
        cell: ({ row }) => <span className='text-xs text-muted-foreground'>{moduleInfo(row.original.module)?.description}</span>,
    }),
    permissionColumn.accessor('level', {
        header: () => <span className='block text-right'>Access</span>,
        cell: ({ row }) => <div className='text-right'><LevelPill level={row.original.level} /></div>,
    }),
])

/** Read-only permission table (same DataTable component as platform admin) */
export function RolePermissionsTable({ role }: { role: ISellerRole }) {
    return <DataTable columns={permissionColumns} data={role.permissions} pageSize={50} />
}
