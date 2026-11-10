import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { InfoIcon, LockIcon, PencilIcon, ShieldCheckIcon, UsersIcon } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { FieldError } from '@/components/ui/field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
    emptyPermissionMap,
    modulesForUserType,
    PERMISSION_LEVELS,
    type PermissionLevel,
    type PermissionModule,
    type UserType,
} from '@/lib/permissions'
import { getAxiosErrorMessage } from '@/lib/api.error'
import { roleApi, type IRoleItem } from '@/api/role'
import { useAppDispatch, useAppSelector } from '@/hooks/use-store'
import { usePermission } from '@/hooks/use-permission'
import { createRole, updateRole } from '@/store/roles/roleSlice'
import StatusBadge from './_component/StatusBadge'

const ROLES_PATH = '/dashboard/users-permissions/role'

const LEVEL_ACTIVE_STYLES: Record<PermissionLevel, string> = {
    NONE: 'bg-background text-muted-foreground shadow-sm',
    VIEW: 'bg-background text-primary shadow-sm',
    EDIT: 'bg-background text-primary shadow-sm',
    MANAGE: 'bg-primary text-primary-foreground shadow-sm',
}

function LevelSegment({ value, onChange, disabled, label }: {
    value: PermissionLevel
    onChange: (v: PermissionLevel) => void
    disabled?: boolean
    label: string
}) {
    return (
        <div role='radiogroup' aria-label={`${label} access`} className='inline-flex shrink-0 gap-0.5 rounded-lg bg-muted p-0.5'>
            {PERMISSION_LEVELS.map(lv => {
                const active = lv.value === value
                return (
                    <button
                        key={lv.value}
                        type='button'
                        role='radio'
                        aria-checked={active}
                        title={lv.hint}
                        disabled={disabled}
                        onClick={() => onChange(lv.value)}
                        className={cn(
                            'min-w-16 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
                            'focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                            active ? LEVEL_ACTIVE_STYLES[lv.value] : 'text-muted-foreground hover:text-foreground',
                            disabled ? 'cursor-default' : 'cursor-pointer',
                            disabled && !active && 'opacity-50'
                        )}
                    >
                        {lv.label}
                    </button>
                )
            })}
        </div>
    )
}

/**
 * One page for three routes:
 *   /role/create        → create
 *   /role/:roleId       → view (read-only)
 *   /role/:roleId/edit  → edit
 */
const RoleFormPage = () => {
    const { roleId } = useParams<{ roleId: string }>()
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const dispatch = useAppDispatch()
    const isSaving = useAppSelector(state => state.roles.isSaving)
    const { can } = usePermission()
    // New roles get the type of the admin creating them (detected, not chosen)
    const creatorUserType = (useAppSelector(state => state.auth.user?.userType) ?? 'PLATFORM_ADMIN') as UserType
    const canManage = can('USERS_PERMISSIONS', 'MANAGE')

    const mode: 'create' | 'view' | 'edit' = !roleId ? 'create' : pathname.endsWith('/edit') ? 'edit' : 'view'

    const [role, setRole] = useState<IRoleItem | null>(null)
    const [isFetching, setIsFetching] = useState(Boolean(roleId))
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [userType, setUserType] = useState<UserType>('PLATFORM_ADMIN')
    const [permissions, setPermissions] = useState(emptyPermissionMap())
    const [nameError, setNameError] = useState<string | null>(null)

    // Load the role from the API by id so the page works on refresh / direct link
    useEffect(() => {
        if (!roleId) {
            setRole(null)
            setName(''); setDescription(''); setUserType(creatorUserType); setPermissions(emptyPermissionMap())
            setIsFetching(false)
            return
        }
        let cancelled = false
        setIsFetching(true)
        roleApi.get(roleId)
            .then(res => {
                if (cancelled) return
                const r = res.data
                setRole(r)
                setName(r.name)
                setDescription(r.description ?? '')
                setUserType(r.userType)
                const map = emptyPermissionMap()
                r.permissions.forEach(p => { map[p.module] = p.level })
                setPermissions(map)
            })
            .catch(err => {
                if (cancelled) return
                toast.error(getAxiosErrorMessage(err, 'Role not found'))
                navigate(ROLES_PATH, { replace: true })
            })
            .finally(() => !cancelled && setIsFetching(false))
        return () => { cancelled = true }
    }, [roleId, navigate, creatorUserType])

    // System roles (Platform Admin) can never be edited — bounce /edit back to view
    useEffect(() => {
        if (mode === 'edit' && role?.isSystem) navigate(`${ROLES_PATH}/${role.id}`, { replace: true })
    }, [mode, role, navigate])

    const readOnly = mode === 'view' || Boolean(role?.isSystem) || !canManage
    const modules = useMemo(() => modulesForUserType(userType), [userType])
    const grantedCount = modules.filter(m => permissions[m.key] !== 'NONE').length

    const setLevel = (module: PermissionModule, level: PermissionLevel) =>
        setPermissions(prev => ({ ...prev, [module]: level }))

    const setAll = (level: PermissionLevel) =>
        setPermissions(prev => {
            const next = { ...prev }
            modules.forEach(m => { next[m.key] = level })
            return next
        })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (readOnly) return

        const trimmed = name.trim()
        if (trimmed.length < 2) {
            setNameError('Role name must be at least 2 characters')
            return
        }

        const payload = {
            name: trimmed,
            description: description.trim(),
            permissions: modules.map(m => ({ module: m.key, level: permissions[m.key] })),
        }

        const result = role
            ? await dispatch(updateRole({ id: role.id, payload }))
            : await dispatch(createRole(payload))

        if (createRole.fulfilled.match(result) || updateRole.fulfilled.match(result)) {
            toast.success(result.payload?.message ?? 'Role saved')
            navigate(`${ROLES_PATH}/${result.payload.data.id}`)
        } else {
            toast.error((result.payload as string) ?? 'Failed to save role')
        }
    }

    const title = mode === 'create' ? 'Create role' : mode === 'edit' ? `Edit role` : (role?.name ?? 'Role')
    const description_ = mode === 'create'
        ? 'Name the role and set what its members can access in each module.'
        : mode === 'edit'
            ? `Update details and permissions for ${role?.name ?? 'this role'}.`
            : role?.isSystem
                ? 'System role with full access to the platform admin panel. It cannot be edited.'
                : (role?.description || 'Permissions granted to members of this role.')

    return (
        // Desktop: exactly fills the page area (viewport − 64px top bar − 3rem padding) so only the matrix scrolls
        <form onSubmit={handleSubmit} className='flex flex-col lg:h-[calc(100svh-64px-3rem)] lg:min-h-0'>
            <PageHeader title={title} description={description_} back className='shrink-0' actions={<>
                {!readOnly && (
                    <div className='flex items-center gap-2'>
                        <Button type='button' variant='outline' className='h-10 cursor-pointer' disabled={isSaving}
                            onClick={() => navigate(role ? `${ROLES_PATH}/${role.id}` : ROLES_PATH)}>
                            Cancel
                        </Button>
                        <Button type='submit' className='h-10 min-w-32 cursor-pointer' disabled={isSaving || isFetching}>
                            {isSaving && <Spinner />}
                            {mode === 'create' ? 'Create role' : 'Save changes'}
                        </Button>
                    </div>
                )}
                {mode === 'view' && role && (
                    <div className='flex items-center gap-2'>
                        <StatusBadge status={role.status} />
                        {canManage && !role.isSystem && (
                            <Button type='button' className='h-10 cursor-pointer' onClick={() => navigate(`${ROLES_PATH}/${role.id}/edit`)}>
                                <PencilIcon /> Edit role
                            </Button>
                        )}
                    </div>
                )}
            </>} />

            <div className='grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-3'>
                {/* Left: role details (stays put) */}
                <div className='grid content-start gap-6 lg:min-h-0 lg:overflow-y-auto'>
                    <Card>
                        <CardHeader className='border-b'>
                            <CardTitle className='flex items-center gap-2 text-base font-semibold'>
                                <ShieldCheckIcon className='size-4 text-primary' /> Role details
                            </CardTitle>
                            <CardDescription>Shown wherever this role is assigned.</CardDescription>
                        </CardHeader>
                        <CardContent className='grid gap-5'>
                            {isFetching ? (
                                <><Skeleton className='h-16' /><Skeleton className='h-20' /><Skeleton className='h-40' /></>
                            ) : (
                                <>
                                    <div className='grid gap-2'>
                                        <Label htmlFor='role-name'>Role name</Label>
                                        <Input
                                            id='role-name'
                                            value={name}
                                            onChange={e => { setName(e.target.value); setNameError(null) }}
                                            placeholder='e.g. Ops manager'
                                            disabled={readOnly || isSaving}
                                            aria-invalid={Boolean(nameError)}
                                            className='h-10'
                                            autoFocus={mode === 'create'}
                                        />
                                        {nameError && <FieldError errors={[{ message: nameError }]} />}
                                    </div>
                                    <div className='grid gap-2'>
                                        <Label htmlFor='role-desc'>
                                            Description <span className='font-normal text-muted-foreground'>(optional)</span>
                                        </Label>
                                        <Textarea
                                            id='role-desc'
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder='What is this role responsible for?'
                                            disabled={readOnly || isSaving}
                                            rows={3}
                                            className='resize-none'
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    {role && (
                        <Card size='sm'>
                            <CardContent className='flex items-center gap-3'>
                                <div className='flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                                    <UsersIcon className='size-4' />
                                </div>
                                <div className='flex-1'>
                                    <div className='text-sm font-semibold'>{role.usersCount} user{role.usersCount === 1 ? '' : 's'}</div>
                                    <div className='text-xs text-muted-foreground'>currently assigned this role</div>
                                </div>
                                {role.isSystem && (
                                    <span className='inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground'>
                                        <LockIcon className='size-3' /> System
                                    </span>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Right: permission matrix */}
                <Card className='pb-0 lg:col-span-2 lg:min-h-0'>
                    <CardHeader className='shrink-0 border-b'>
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                            <div>
                                <CardTitle className='text-base font-semibold'>Permission matrix</CardTitle>
                                <CardDescription className='mt-1'>
                                    {modules.length
                                        ? <>Access to <b className='text-foreground'>{grantedCount}</b> of {modules.length} modules</>
                                        : 'This role has no admin panel access.'}
                                </CardDescription>
                            </div>
                            {!readOnly && modules.length > 0 && (
                                <div className='flex items-center gap-1 text-xs'>
                                    <span className='mr-1 text-muted-foreground'>Set all:</span>
                                    {PERMISSION_LEVELS.map(lv => (
                                        <Button key={lv.value} type='button' variant='outline' size='xs' className='cursor-pointer'
                                            onClick={() => setAll(lv.value)} disabled={isSaving}>
                                            {lv.label}
                                        </Button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    {/* Only this region scrolls */}
                    <CardContent className='p-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto'>
                        {isFetching ? (
                            <div className='grid gap-3 p-4'>
                                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className='h-12' />)}
                            </div>
                        ) : modules.length === 0 ? (
                            <div className='m-4 flex items-start gap-3 rounded-lg border border-dashed bg-muted/30 p-4 text-sm'>
                                <InfoIcon className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                                <div>
                                    <div className='font-semibold'>No admin panel permissions</div>
                                    <div className='mt-0.5 text-muted-foreground'>
                                        Members of this role don't have access to any admin modules.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className='sticky top-0 z-10 hidden grid-cols-[1fr_auto] border-b bg-muted px-5 py-2 text-xs font-semibold text-muted-foreground sm:grid'>
                                    <span>Module</span>
                                    <span className='pr-1'>Access level</span>
                                </div>
                                {modules.map((m, i) => (
                                    <div
                                        key={m.key}
                                        className={cn(
                                            'flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between',
                                            i > 0 && 'border-t',
                                            permissions[m.key] === 'NONE' && 'bg-muted/20'
                                        )}
                                    >
                                        <div className='min-w-0'>
                                            <div className='text-sm font-semibold'>{m.label}</div>
                                            <div className='text-xs text-muted-foreground'>{m.description}</div>
                                        </div>
                                        <LevelSegment
                                            label={m.label}
                                            value={permissions[m.key]}
                                            onChange={v => setLevel(m.key, v)}
                                            disabled={readOnly || isSaving}
                                        />
                                    </div>
                                ))}
                                <p className='border-t px-5 py-3 text-xs text-muted-foreground'>
                                    Levels are cumulative: <b>Manage</b> includes Edit, and <b>Edit</b> includes View.
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

        </form>
    )
}

export default RoleFormPage
